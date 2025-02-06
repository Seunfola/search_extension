/// <reference types="chrome" />

chrome.runtime.onInstalled.addListener(() => {
  setInterval(() => chrome.runtime.getPlatformInfo, 20e3);
});