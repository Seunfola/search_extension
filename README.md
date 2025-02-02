# Keyword Highlighter Chrome Extension

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
![Chrome Web Store](https://img.shields.io/chrome-web-store/v/your-extension-id-here?label=Chrome%20Web%20Store)
![Version](https://img.shields.io/badge/version-1.0.0-blue)

A sophisticated Chrome extension for detecting and highlighting keywords on web pages with advanced theme support and persistent configuration.

![Extension Demo](assets/demo.gif)

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Development](#development)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Features

### Core Functionality
- **Multi-keyword Search**: Highlight multiple keywords/phrases simultaneously
- **Dynamic Theme Support**: Automatic light/dark mode detection
- **Case Sensitivity Toggle**: Optional case-sensitive matching
- **Match Statistics**: Real-time match counter display
- **Persistent Storage**: Remembers user preferences between sessions

### Advanced Capabilities
- **Context Preservation**: Maintains original page structure during highlighting
- **Performance Optimized**: Efficient DOM manipulation with TreeWalker API
- **Cross-site Compatibility**: Works on all standard web pages (`<all_urls>`)
- **Accessibility Ready**: Proper contrast ratios and keyboard navigation

## Installation

### Prerequisites
- Google Chrome v88+ or compatible Chromium browser
- Git (for development setup)

### User Installation
1. Download the latest release package
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer Mode** (toggle in top-right corner)
4. Drag and drop the `.crx` file into the extensions page

### Developer Setup
```bash
git clone https://github.com/yourusername/keyword-highlighter.git
cd keyword-highlighter
