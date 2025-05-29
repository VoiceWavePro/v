import os
import json
import tempfile
from datetime import datetime
from TTS.api import TTS
import gradio as gr
from pydub import AudioSegment

# Initialize TTS model
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")

# Load language configuration
with open("languages.json") as f:
    languages = json.load(f)

# Create temp directory
temp_dir = tempfile.TemporaryDirectory()

def generate_speech(text: str, language: str) -> tuple:
    """Generate speech audio from text with enhanced error handling"""
    try:
        # Input validation
        if not text.strip():
            return None, "Please enter valid text"
            
        if len(text) > 5000:
            return None, "Text too long (max 5000 characters)"
            
        if language not in languages:
            return None, "Selected language not supported"

        # Get voice reference
        voice_file = languages[language]["voice_file"]
        voice_path = os.path.join("voices", voice_file)
        
        if not os.path.exists(voice_path):
            return None, "Voice reference not found"

        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        base_name = f"{language}_{timestamp}"
        wav_path = os.path.join(temp_dir.name, f"{base_name}.wav")
        mp3_path = os.path.join(temp_dir.name, f"{base_name}.mp3")

        # Generate audio
        tts.tts_to_file(
            text=text,
            speaker_wav=voice_path,
            language=language,
            file_path=wav_path
        )

        # Convert to MP3
        audio = AudioSegment.from_wav(wav_path)
        audio.export(mp3_path, format="mp3")

        return mp3_path, None

    except Exception as e:
        return None, f"Generation failed: {str(e)}"

# Gradio interface configuration
interface = gr.Interface(
    fn=generate_speech,
    inputs=[
        gr.Textbox(
            label="Enter Text",
            lines=5,
            placeholder="Type or paste your text here...",
            max_length=5000
        ),
        gr.Dropdown(
            label="Select Language",
            choices=list(languages.keys()),
            value="en"
        )
    ],
    outputs=[
        gr.Audio(label="Generated Speech"),
        gr.Textbox(label="Error", visible=False)
    ],
    title="VoiceWave Pro 🌍",
    description=(
        "Convert text to natural-sounding speech in multiple languages. "
        "Supports English, Hindi, Tamil, Telugu, French & Spanish."
    ),
    examples=[
        ["Welcome to VoiceWave Pro!", "en"],
        ["வணக்கம்! இது தமிழில் ஒரு சோதனை.", "ta"],
        ["नमस्ते! यह हिंदी में एक परीक्षण है।", "hi"]
    ]
)

# Hugging Face deployment settings
interface.launch(
    server_name="0.0.0.0",
    server_port=7860,
    enable_queue=True,
    share=False
)