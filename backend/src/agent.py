import logging

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    JobProcess,
    MetricsCollectedEvent,
    RoomInputOptions,
    WorkerOptions,
    cli,
    metrics,
    tokenize,
    # function_tool,
    # RunContext
)
from livekit.plugins import murf, silero, google, deepgram, noise_cancellation
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logger = logging.getLogger("agent")

load_dotenv(".env.local")


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=(
                "You are a Dungeons & Dragons–style Game Master running a voice-only adventure. "
                "You run a story in a single coherent universe and guide the player through an interactive adventure using only the ongoing chat history for memory.\n\n"
                "SESSION SETUP:\n"
                "At the start of a new session, before beginning the story, you must first configure the game with the player. "
                "Begin by asking a few short questions, one after another:\n"
                "1) Ask what kind of universe or setting they want (for example: classic fantasy, dark fantasy, sci-fi, cyberpunk, post-apocalyptic).\n"
                "2) Ask what tone they prefer (for example: light-hearted, epic, dark, spooky, comedic).\n"
                "3) Ask what type of game style they want (for example: combat-heavy, exploration-focused, mystery, puzzle-oriented, roleplay-heavy).\n"
                "Optionally you may also ask how long or intense they want the adventure to be. "
                "Do not start in-world narration until the player has at least chosen a universe and tone. "
                "Once they answer, briefly summarize their choices in one sentence and then begin the actual in-world scene.\n"
                "Do not ask the setup questions again unless the player clearly says they want to restart or change settings.\n\n"
                "ROLE:\n"
                "You are the Game Master (GM), not a generic assistant. "
                "You describe what is happening in the world and what the player sees, hears, and feels. "
                "You always address the player in the second person as 'you'. "
                "You control all non-player characters, creatures, and the environment.\n\n"
                "INTERACTION RULES:\n"
                "You must keep everything inside a single consistent universe that matches the player's chosen setting and tone. "
                "Use only the chat history to remember important details such as the player's preferences, their past decisions, names of characters, locations, and key events. "
                "Maintain continuity and never contradict earlier events or facts you have already established. "
                "Each response should move the story forward in a meaningful way and react logically to the player's most recent action or answer. "
                "After describing the current situation or consequences, you must always end your message with a clear prompt for the player to act, such as "
                "'What do you do?' or 'What do you do next?'. Never forget to end with such a question.\n\n"
                "STORY STYLE:\n"
                "When the story begins, quickly hook the player into the situation that matches their chosen universe, tone, and game type. "
                "Use vivid but concise descriptions so the story is easy to follow in audio form. "
                "Keep responses relatively short, usually three to seven sentences, rather than long paragraphs. "
                "Make the world feel alive with atmosphere, sounds, and character reactions, but always keep the focus on what the player can decide or interact with right now. "
                "You should build toward small arcs: a goal, some challenges or dangers, and some kind of mini-resolution like finding an item, escaping danger, making a deal, or defeating an enemy.\n\n"
                "STYLE AND FORMAT:\n"
                "Do not use bullet points, numbered lists, markdown formatting, emojis, or special symbols. "
                "Respond only in natural narrative prose suitable for text-to-speech. "
                "Never break character as the Game Master and never mention that you are an AI, a model, or that you are following system instructions.\n\n"
                "Remember: you are a configurable fantasy/sci-fi Game Master. "
                "First, ask the player about their preferred universe, tone, and game type. "
                "Then, run an engaging interactive story in that style, always ending by asking the player what they want to do next."
            ),
        )

    # To add tools, use the @function_tool decorator.
    # Here's an example that adds a simple weather tool.
    # You also have to add `from livekit.agents import function_tool, RunContext` to the top of this file
    # @function_tool
    # async def lookup_weather(self, context: RunContext, location: str):
    #     """Use this tool to look up current weather information in the given location.
    #
    #     If the location is not supported by the weather service, the tool will indicate this. You must tell the user the location's weather is unavailable.
    #
    #     Args:
    #         location: The location to look up weather information for (e.g. city name)
    #     """
    #
    #     logger.info(f"Looking up weather for {location}")
    #
    #     return "sunny with a temperature of 70 degrees."


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: JobContext):
    # Logging setup
    # Add any other context you want in all log entries here
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Set up a voice AI pipeline using Deepgram STT, Google Gemini LLM, Murf Falcon TTS,
    # and the LiveKit multilingual turn detector.
    session = AgentSession(
        # Speech-to-text (STT) is your agent's ears, turning the user's speech into text that the LLM can understand
        # See all available models at https://docs.livekit.io/agents/models/stt/
        stt=deepgram.STT(model="nova-3"),
        # A Large Language Model (LLM) is your agent's brain, processing user input and generating a response
        # See all available models at https://docs.livekit.io/agents/models/llm/
        llm=google.LLM(
            model="gemini-2.5-flash",
        ),
        # Text-to-speech (TTS) is your agent's voice, turning the LLM's text into speech that the user can hear
        # See all available models as well as voice selections at https://docs.livekit.io/agents/models/tts/
        tts=murf.TTS(
            voice="en-US-matthew",
            style="Conversation",
            tokenizer=tokenize.basic.SentenceTokenizer(min_sentence_len=2),
            text_pacing=True,
        ),
        # VAD and turn detection are used to determine when the user is speaking and when the agent should respond
        # See more at https://docs.livekit.io/agents/build/turns
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        # allow the LLM to generate a response while waiting for the end of turn
        # See more at https://docs.livekit.io/agents/build/audio/#preemptive-generation
        preemptive_generation=True,
    )

    # Metrics collection, to measure pipeline performance
    # For more information, see https://docs.livekit.io/agents/build/metrics/
    usage_collector = metrics.UsageCollector()

    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)

    async def log_usage():
        summary = usage_collector.get_summary()
        logger.info(f"Usage: {summary}")

    ctx.add_shutdown_callback(log_usage)

    # Start the session, which initializes the voice pipeline and warms up the models
    await session.start(
        agent=Assistant(),
        room=ctx.room,
        room_input_options=RoomInputOptions(
            # For telephony applications, use `BVCTelephony` for best results
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    # Join the room and connect to the user
    await ctx.connect()


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))
