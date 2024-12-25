class LeetCodeRandomizer {
  constructor() {
    this.problems = [];
    this.currentProblem = null;
    this.initializeElements();
    this.addEventListeners();
    this.initialize();
  }

  initializeElements() {
    this.generateBtn = document.getElementById('generateBtn');
    this.problemInfo = document.getElementById('problemInfo');
    this.problemTitle = document.getElementById('problemTitle');
    this.problemDifficulty = document.getElementById('problemDifficulty');
    this.timeDisplay = document.getElementById('timeDisplay');
    this.startTimerBtn = document.getElementById('startTimer');
    this.resetTimerBtn = document.getElementById('resetTimer');
    this.loadingState = document.getElementById('loadingState');
    this.configSection = document.querySelector('.config-section');

    // Configuration elements
    this.easyCheckbox = document.getElementById('easy');
    this.mediumCheckbox = document.getElementById('medium');
    this.hardCheckbox = document.getElementById('hard');
    this.timeInput = document.getElementById('time');
  }

  async loadConfiguration() {
    const config = await chrome.storage.local.get(['configuration']);
    if (config.configuration) {
      this.easyCheckbox.checked = config.configuration.easy;
      this.mediumCheckbox.checked = config.configuration.medium;
      this.hardCheckbox.checked = config.configuration.hard;
      this.timeInput.value = config.configuration.timeLimit;
    }
  }

  saveConfiguration() {
    const configuration = {
      easy: this.easyCheckbox.checked,
      medium: this.mediumCheckbox.checked,
      hard: this.hardCheckbox.checked,
      timeLimit: this.timeInput.value
    };
    chrome.storage.local.set({ configuration });
  }

  async initialize() {
    // First check if there's an active timer
    const timerState = await this.checkTimerState();
    
    if (timerState.isTimerActive) {
      // If timer is active, show it immediately
      this.currentProblem = timerState.currentProblem;
      this.displayProblem();
      this.updateTimerDisplay(timerState.timeLeft);
      this.showActiveTimer();
      this.disableConfiguration();
    } else {
      // Only fetch problems if no timer is active
      this.showLoading(true);
      const isLoggedIn = await this.checkLoginStatus();
      if (isLoggedIn) {
        await this.fetchProblems();
      }
      this.showLoading(false);
    }
  }

  async checkTimerState() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'GET_TIMER_STATE' },
        (response) => {
          resolve(response || { isTimerActive: false, timeLeft: 0, currentProblem: null });
        }
      );
    });
  }

  disableConfiguration() {
    // Disable problem generation and configuration when timer is active
    this.generateBtn.disabled = true;
    this.configSection.classList.add('disabled');
    const inputs = this.configSection.querySelectorAll('input');
    inputs.forEach(input => input.disabled = true);
  }

  enableConfiguration() {
    this.generateBtn.disabled = false;
    this.configSection.classList.remove('disabled');
    const inputs = this.configSection.querySelectorAll('input');
    inputs.forEach(input => {input.disabled = false});
  }

  showLoading(show) {
    if (show) {
      this.loadingState.classList.remove("hidden");
      this.generateBtn.disabled = true;
    } else {
      this.loadingState.classList.add("hidden");
      this.generateBtn.disabled = false;
    }
  }

  async checkLoginStatus() {
    try {
      const response = await fetch("https://leetcode.com/api/problems/all/", {
        credentials: "include",
      });
      const data = await response.json();

      if (!data.user_name) {
        this.showLoginPrompt();
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error checking login status:", error);
      this.showLoginPrompt();
      return false;
    }
  }

  addEventListeners() {
    this.generateBtn.addEventListener('click', () => this.generateProblem());
    this.startTimerBtn.addEventListener('click', () => this.startTimer());
    this.resetTimerBtn.addEventListener('click', () => this.resetTimer());

    // Save configuration when changed
    this.easyCheckbox.addEventListener('change', () => this.saveConfiguration());
    this.mediumCheckbox.addEventListener('change', () => this.saveConfiguration());
    this.hardCheckbox.addEventListener('change', () => this.saveConfiguration());
    this.timeInput.addEventListener('change', () => this.saveConfiguration());
  }

  async loadCurrentState() {
    const state = await chrome.storage.local.get([
      "currentProblem",
      "timerActive",
    ]);
    if (state.currentProblem) {
      this.currentProblem = state.currentProblem;
      this.displayProblem();
      if (state.timerActive) {
        this.updateTimerDisplay();
      }
    }
  }

  showLoginPrompt() {
    const loginPrompt = document.createElement("div");
    loginPrompt.className = "login-prompt";
    loginPrompt.innerHTML = `
      <p>Please log in to LeetCode first</p>
      <button id="loginBtn">Login to LeetCode</button>
    `;

    // Remove existing login prompt if any
    const existingPrompt = document.querySelector(".login-prompt");
    if (existingPrompt) {
      existingPrompt.remove();
    }

    document.querySelector(".container").appendChild(loginPrompt);

    document.getElementById("loginBtn").addEventListener("click", () => {
      chrome.tabs.create({ url: "https://leetcode.com/accounts/login/" });
    });
  }

  async fetchProblems() {
    try {
      const response = await fetch("https://leetcode.com/api/problems/all/", {
        credentials: "include",
      });
      const data = await response.json();

      if (!data.stat_status_pairs) {
        throw new Error("No problems data received");
      }

      this.problems = data.stat_status_pairs
        .filter((problem) => !problem.paid_only) // Filter out premium problems
        .map((problem) => ({
          id: problem.stat.question_id,
          title: problem.stat.question__title,
          difficulty: ["Easy", "Medium", "Hard"][problem.difficulty.level - 1],
          url: `https://leetcode.com/problems/${problem.stat.question__title_slug}`,
        }));

      console.log(`Loaded ${this.problems.length} problems`);
      this.generateBtn.disabled = false;
    } catch (error) {
      console.error("Error fetching problems:", error);
      alert("Error loading problems from LeetCode. Please try refreshing.");
    }
  }

  async generateProblem() {
    if (this.problems.length === 0) {
      await this.fetchProblems();
    }

    const selectedDifficulties = {
      easy: document.getElementById("easy").checked,
      medium: document.getElementById("medium").checked,
      hard: document.getElementById("hard").checked,
    };

    const filteredProblems = this.problems.filter(
      (p) => selectedDifficulties[p.difficulty.toLowerCase()]
    );

    filteredProblems[0] = true;

    if (filteredProblems.length === 0) {
      alert("Please select at least one difficulty level");
      return;
    }

    const randomIndex = Math.floor(Math.random() * filteredProblems.length);
    this.currentProblem = filteredProblems[randomIndex];
    chrome.storage.local.set({ currentProblem: this.currentProblem });
    this.displayProblem();
  }

  displayProblem() {
    if(this.currentProblem===null){
      return;
    }
    this.problemInfo.classList.remove("hidden");
    this.problemTitle.innerHTML = `<a href="${this.currentProblem.url}" target="_blank">
        ${this.currentProblem.title}</a>`;
    this.problemDifficulty.textContent = `Difficulty: ${this.currentProblem.difficulty}`;
    this.startTimerBtn.disabled = false;
    this.resetTimer();
  }
  async syncTimerState() {
    // Get current timer state from background
    chrome.runtime.sendMessage(
      { action: 'GET_TIMER_STATE' },
      (response) => {
        if (response.isTimerActive) {
          this.currentProblem = response.currentProblem;
          this.displayProblem();
          this.updateTimerDisplay(response.timeLeft);
          this.showActiveTimer();
        }
      }
    );
  }

  showActiveTimer() {
    this.problemInfo.classList.remove('hidden');
    this.startTimerBtn.classList.add('hidden');
    this.resetTimerBtn.classList.remove('hidden');
    this.disableConfiguration();
  }

  startTimer() {
    const minutes = parseInt(document.getElementById('time').value);
    if (isNaN(minutes) || minutes < 1) {
      alert('Please enter a valid time limit');
      return;
    }

    // Save configuration before starting timer
    this.saveConfiguration();

    // Open problem in new tab
    chrome.tabs.create({ url: this.currentProblem.url });

    chrome.runtime.sendMessage({
      action: 'START_TIMER',
      duration: minutes,
      problem: this.currentProblem
    });

    this.showActiveTimer();
  }

  updateTimerDisplay(timeLeft) {
    if (timeLeft === undefined) return;
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    this.timeDisplay.textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (timeLeft > 0) {
      this.showActiveTimer();
    }
  }

  stopTimer() {
    clearInterval(this.timer);
    this.timer = null;
  }

  resetTimer() {
    chrome.runtime.sendMessage({ action: 'RESET_TIMER' });
    this.timeDisplay.textContent = '00:00';
    this.startTimerBtn.classList.remove('hidden');
    this.resetTimerBtn.classList.add('hidden');
    this.enableConfiguration();

    // Load saved configuration after reset
    this.loadConfiguration();
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  const app = new LeetCodeRandomizer();
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'UPDATE_TIMER') {
      app.updateTimerDisplay(message.timeLeft);
    }
  });
});
