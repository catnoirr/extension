# Text Explainer Chrome Extension

A Chrome extension that explains selected text using Google's Gemini AI.

## Features

- Select any text on a webpage to get an AI-powered explanation
- Simple and clean interface
- Uses Gemini API for high-quality explanations
- Works on any website

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked" and select the folder containing this extension
5. The extension is now installed!

## Setup

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click on the extension icon in your Chrome toolbar
3. Enter your API key in the popup and click Save

## Usage

1. Select any text on a webpage that you want explained
2. Click the "Explain" button that appears near your selection
3. View the AI-powered explanation in the popup

## File Structure

- `manifest.json`: Configuration file for the extension
- `popup.html/js/css`: Files for the API key configuration popup
- `content.js/css`: Files that handle text selection and explanations

## Privacy

- Your API key is stored locally in your browser
- Selected text is sent directly to the Gemini API
- No data is stored on any servers 