let timer = null;
let timeLeft = 0;
let currentProblem = null;
let isTimerActive = false;

// Store timer state
function saveTimerState() {
  chrome.storage.local.set({
    timeLeft: timeLeft,
    isTimerActive: isTimerActive,
    currentProblem: currentProblem,
  });
}

// Initialize timer state when extension loads
chrome.runtime.onInstalled.addListener(async () => {
  const state = await chrome.storage.local.get([
    "timeLeft",
    "isTimerActive",
    "currentProblem",
  ]);
  timeLeft = state.timeLeft || 0;
  isTimerActive = state.isTimerActive || false;
  currentProblem = state.currentProblem;

  if (isTimerActive && timeLeft > 0) {
    startTimer();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "GET_TIMER_STATE":
      sendResponse({
        timeLeft: timeLeft,
        isTimerActive: isTimerActive,
        currentProblem: currentProblem,
      });
      break;
    case "START_TIMER":
      currentProblem = request.problem;
      startTimer(request.duration);
      break;
    case "RESET_TIMER":
      resetTimer();
      break;
  }
  return true;
});

function startTimer(minutes) {
  resetTimer();

  if (minutes) {
    timeLeft = minutes * 60;
  }

  isTimerActive = true;
  saveTimerState();

  timer = setInterval(() => {
    timeLeft--;
    broadcastTimerUpdate();

    if (timeLeft <= 0) {
      timerComplete();
    }
  }, 1000);
}

function broadcastTimerUpdate() {
  chrome.runtime.sendMessage({
    action: "UPDATE_TIMER",
    timeLeft: timeLeft,
    isTimerActive: isTimerActive,
  });
  saveTimerState();
}

// When timer completes, don't clear the configuration
function resetTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  timeLeft = 0;
  isTimerActive = false;
  currentProblem = null;

  // Save timer state but keep configuration
  saveTimerState();
  broadcastTimerUpdate();
}

function timerComplete() {
  resetTimer();
  chrome.notifications.create({
    type: "basic",
    iconUrl: "assets/icon128.png",
    title: "Time's Up!",
    message: "Your solving time has expired!",
  });
}

function saveTimerState() {
  chrome.storage.local.set({
    timeLeft: timeLeft,
    isTimerActive: isTimerActive,
    currentProblem: currentProblem,
  });
}

function broadcastTimerUpdate() {
  chrome.tabs.query({url: "https://leetcode.com/problems/*"}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'UPDATE_TIMER',
        timeLeft: timeLeft,
        isTimerActive: isTimerActive
      });
    });
  });
  
  chrome.runtime.sendMessage({
    action: 'UPDATE_TIMER',
    timeLeft: timeLeft,
    isTimerActive: isTimerActive
  });
  
  saveTimerState();
}
