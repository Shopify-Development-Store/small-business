// All JS logic from index.html moved here for modularity.
// See index.html for element structure. This file is imported at the end of the body.

const API_KEY = "AIzaSyCnmAEXvB-TKJpDATCxiN5rkfUORZZf7VI";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// In-memory storage for session data
let ideaHistory = [];
let favoriteIdeas = [];
let currentIdea = null;

// Load data from localStorage on page load
document.addEventListener('DOMContentLoaded', function () {
	loadFromLocalStorage();
	updateStats();
	updateHistoryDisplay();
	updateFavoritesDisplay();

	// Add hover effects to inputs
	const inputs = document.querySelectorAll('input, select');
	inputs.forEach(input => {
		input.addEventListener('focus', function () {
			this.parentElement.style.transform = 'scale(1.02)';
			this.parentElement.style.transition = 'transform 0.3s ease';
		});

		input.addEventListener('blur', function () {
			this.parentElement.style.transform = 'scale(1)';
		});
	});
});

// Save data to localStorage
function saveToLocalStorage() {
	localStorage.setItem('businessIdeaHistory', JSON.stringify(ideaHistory));
	localStorage.setItem('businessIdeaFavorites', JSON.stringify(favoriteIdeas));
}

// Load data from localStorage
function loadFromLocalStorage() {
	const savedHistory = localStorage.getItem('businessIdeaHistory');
	const savedFavorites = localStorage.getItem('businessIdeaFavorites');

	if (savedHistory) {
		ideaHistory = JSON.parse(savedHistory);
	}

	if (savedFavorites) {
		favoriteIdeas = JSON.parse(savedFavorites);
	}
}

// Tab switching
function switchTab(tabName) {
	// Hide all tabs
	document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
	document.querySelectorAll('[id^="tab-"]').forEach(tab => tab.classList.remove('tab-active'));

	// Show selected tab
	document.getElementById(`${tabName}-tab`).classList.remove('hidden');
	document.getElementById(`tab-${tabName}`).classList.add('tab-active');
	if (tabName === 'chat') {
		updateChatContextSelect();
		updateChatContextHeader();
	}
}

function setIndustry(industry) {
	document.getElementById('industry').value = industry;
}

function setBudget(budget) {
	document.getElementById('budget').value = budget;
}

// Show toast notification
function showToast(message, duration = 3000) {
	const toast = document.getElementById('toast');
	toast.textContent = message;
	toast.classList.add('show');

	setTimeout(() => {
		toast.classList.remove('show');
	}, duration);
}

// Copy text to clipboard
function copyToClipboard(elementId) {
	const element = document.getElementById(elementId);
	let textToCopy = '';

	if (element.tagName === 'P') {
		textToCopy = element.textContent;
	} else if (element.tagName === 'UL') {
		const items = Array.from(element.querySelectorAll('li')).map(li => {
			if (li.querySelector('span')) {
				return li.querySelector('span').textContent;
			}
			return li.textContent;
		});
		textToCopy = items.join('\n');
	}

	navigator.clipboard.writeText(textToCopy).then(() => {
		showToast('Copied to clipboard!');

		// Highlight the copy button
		const buttons = document.querySelectorAll('.copy-btn');
		buttons.forEach(btn => {
			if (btn.getAttribute('onclick').includes(elementId)) {
				btn.classList.add('copied');
				setTimeout(() => {
					btn.classList.remove('copied');
				}, 2000);
			}
		});
	});
}

// Export data as JSON file
function exportData(data, filename) {
	const dataStr = JSON.stringify(data, null, 2);
	const dataBlob = new Blob([dataStr], { type: 'application/json' });
	const url = URL.createObjectURL(dataBlob);

	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	showToast('Export started!');
}

function exportHistory() {
	if (ideaHistory.length === 0) {
		showToast('No history to export!');
		return;
	}
	exportData(ideaHistory, 'business-ideas-history.json');
}

function exportFavorites() {
	if (favoriteIdeas.length === 0) {
		showToast('No favorites to export!');
		return;
	}
	exportData(favoriteIdeas, 'business-ideas-favorites.json');
}

// Generate business idea
async function generateIdea() {
	const industry = document.getElementById("industry").value.trim();
	const budget = document.getElementById("budget").value.trim();
	const tone = document.getElementById("tone").value;

	if (!industry || !budget) {
		showToast("Please enter both industry and budget!");
		return;
	}

	// Show loading state
	const btnText = document.getElementById("btnText");
	const loadingText = document.getElementById("loadingText");
	const generateBtn = document.getElementById("generateBtn");

	btnText.classList.add("hidden");
	loadingText.classList.remove("hidden");
	generateBtn.disabled = true;
	generateBtn.classList.add("opacity-75");

	try {
		const prompt = `
You are a creative business consultant. Generate a comprehensive business idea with the following details:
1. A detailed business idea paragraph for a ${industry} business with a budget of $${budget}.
   Tone: ${tone || "default"}.
   Include potential target market, unique selling points, and revenue streams.
2. Suggest 5 creative brand names that are memorable and relevant.
3. Create 3 engaging social media captions for promotion.
4. Identify 3-5 key tags that categorize this business (e.g., "eco-friendly", "tech", "subscription").
Return output in this JSON format:
{
  "idea": "...",
  "names": ["...", "...", "...", "...", "..."],
  "captions": ["...", "...", "..."],
  "tags": ["...", "...", "..."]
}
`;

		const res = await fetch(API_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				contents: [{ parts: [{ text: prompt }] }]
			})
		});

		const data = await res.json();
		const text = data?.candidates?.[0]?.content?.parts?.[0]?.text.replace('```json', "").replace('```', "") || "";
		const parsed = JSON.parse(text);

		// Store current idea with additional metadata
		currentIdea = {
			id: Date.now(),
			industry,
			budget,
			tone: tone || "default",
			...parsed,
			timestamp: new Date().toLocaleString(),
			isFavorite: false
		};

		// Add to history
		ideaHistory.unshift(currentIdea);
		// Save to localStorage
		saveToLocalStorage();
		// Update UI
		displayCurrentIdea(parsed);
		updateStats();
		updateHistoryDisplay();
	} catch (e) {
		showToast("Error generating ideas. Please try again.");
		console.error("Error:", e);
	} finally {
		// Reset button state
		btnText.classList.remove("hidden");
		loadingText.classList.add("hidden");
		generateBtn.disabled = false;
		generateBtn.classList.remove("opacity-75");
	}
}

function displayCurrentIdea(parsed) {
	document.getElementById("ideaOutput").textContent = parsed.idea;
	// Display brand names with copy buttons for each
	document.getElementById("brandOutput").innerHTML = parsed.names.map((n, i) =>
		`<li class="bg-white/10 p-3 rounded-xl text-white hover:bg-white/20 transition-all duration-300 flex justify-between items-center">
		<span class="font-semibold">🏢 ${n}</span>
		<button onclick="copyToClipboard('brandName${i}')" class="copy-btn text-white p-1 rounded-lg text-sm">
			📋
		</button>
		<span id="brandName${i}" class="hidden">${n}</span>
	</li>`
	).join("");

	// Display captions with copy buttons for each
	document.getElementById("captionOutput").innerHTML = parsed.captions.map((c, i) =>
		`<li class="bg-white/10 p-3 rounded-xl text-white hover:bg-white/20 transition-all duration-300 flex justify-between items-center">
		<span class="italic">"${c}"</span>
		<button onclick="copyToClipboard('caption${i}')" class="copy-btn text-white p-1 rounded-lg text-sm">
			📋
		</button>
		<span id="caption${i}" class="hidden">${c}</span>
	</li>`
	).join("");

	// Display tags
	const tagsContainer = document.getElementById("ideaTags");
	tagsContainer.innerHTML = parsed.tags.map(tag =>
		`<span class="tag tag-${['blue', 'green', 'purple', 'yellow', 'red'][Math.floor(Math.random() * 5)]}">${tag}</span>`
	).join("");

	// Update favorite star
	updateCurrentFavoriteStar();

	// Show results
	const resultsDiv = document.getElementById("results");
	resultsDiv.classList.remove("hidden");
	resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

	// Update chat context select if on chat tab
	if (document.getElementById('chat-tab') && !document.getElementById('chat-tab').classList.contains('hidden')) {
		updateChatContextSelect();
	}
}

function toggleFavorite(type, id = null) {
	if (type === 'current' && currentIdea) {
		const existingFav = favoriteIdeas.find(f => f.id === currentIdea.id);
		if (existingFav) {
			// Remove from favorites
			favoriteIdeas = favoriteIdeas.filter(f => f.id !== currentIdea.id);
			currentIdea.isFavorite = false;
			showToast('Removed from favorites');
		} else {
			// Add to favorites
			currentIdea.isFavorite = true;
			favoriteIdeas.push({ ...currentIdea });
			showToast('Added to favorites!');
		}
		updateCurrentFavoriteStar();
	} else if (id) {
		// Toggle favorite for history item
		const historyItem = ideaHistory.find(h => h.id === id);
		if (historyItem) {
			historyItem.isFavorite = !historyItem.isFavorite;
			if (historyItem.isFavorite) {
				favoriteIdeas.push({ ...historyItem });
				showToast('Added to favorites!');
			} else {
				favoriteIdeas = favoriteIdeas.filter(f => f.id !== id);
				showToast('Removed from favorites');
			}
		}
	}

	// Save to localStorage
	saveToLocalStorage();
	updateStats();
	updateHistoryDisplay();
	updateFavoritesDisplay();
}

function updateCurrentFavoriteStar() {
	const star = document.getElementById('currentFavStar');
	if (currentIdea && currentIdea.isFavorite) {
		star.classList.add('active');
		star.textContent = '⭐'; // Filled star
	} else {
		star.classList.remove('active');
		star.textContent = '☆'; // Empty star
	}
}

function updateStats() {
	document.getElementById('totalGenerated').textContent = ideaHistory.length;
	document.getElementById('totalFavorites').textContent = favoriteIdeas.length;
	document.getElementById('historyCount').textContent = ideaHistory.length;
	document.getElementById('favoritesCount').textContent = favoriteIdeas.length;
}

function updateHistoryDisplay() {
	const historyList = document.getElementById('historyList');
	if (ideaHistory.length === 0) {
		historyList.innerHTML = `
		<div class="text-center text-white/60 py-8">
			<span class="text-6xl mb-4 block">📝</span>
			<p>No ideas generated yet. Start creating some amazing business ideas!</p>
		</div>
	`;
		return;
	}

	historyList.innerHTML = ideaHistory.map(idea => `
	<div class="bg-white/10 p-4 rounded-2xl hover:bg-white/20 transition-all duration-300" data-search="${idea.industry.toLowerCase()} ${idea.idea.toLowerCase()} ${idea.tags ? idea.tags.join(' ').toLowerCase() : ''}">
		<div class="flex justify-between items-start mb-3">
			<div>
				<div class="flex items-center space-x-2 mb-2">
					${idea.isFavorite ? '<span class="bg-yellow-500/30 text-white px-2 py-1 rounded-full text-xs">⭐ Favorite</span>' : ''}
					<span class="bg-blue-500/30 text-white px-2 py-1 rounded-full text-xs">${idea.industry}</span>
					<span class="text-white/60 text-xs">$${idea.budget}</span>
					<span class="text-white/60 text-xs">${idea.timestamp}</span>
				</div>
			</div>
			<span class="favorite-star text-xl ${idea.isFavorite ? 'active' : ''}" onclick="toggleFavorite('history', ${idea.id})">
				${idea.isFavorite ? '⭐' : '☆'}
			</span>
		</div>
		<p class="text-white mb-3 leading-relaxed">${idea.idea}</p>
		${idea.tags && idea.tags.length ? `
		<div class="mb-3 flex flex-wrap">
			${idea.tags.map(tag =>
		`<span class="tag tag-${['blue', 'green', 'purple', 'yellow', 'red'][Math.floor(Math.random() * 5)]}">${tag}</span>`
	).join('')}
		</div>` : ''}
		<div class="grid md:grid-cols-2 gap-4">
			<div>
				<h4 class="text-white font-semibold mb-2">🏷️ Brand Names:</h4>
				<ul class="text-white/80 text-sm space-y-1">
					${idea.names.map(name => `<li>• ${name}</li>`).join('')}
				</ul>
			</div>
			<div>
				<h4 class="text-white font-semibold mb-2">📱 Captions:</h4>
				<ul class="text-white/80 text-sm space-y-1">
					${idea.captions.map(caption => `<li>• "${caption}"</li>`).join('')}
				</ul>
			</div>
		</div>
	</div>
`).join('');
}

function updateFavoritesDisplay() {
	const favoritesList = document.getElementById('favoritesList');
	if (favoriteIdeas.length === 0) {
		favoritesList.innerHTML = `
		<div class="text-center text-white/60 py-8">
			<span class="text-6xl mb-4 block">⭐</span>
			<p>No favorites saved yet. Star your favorite ideas to save them here!</p>
		</div>
	`;
		return;
	}

	favoritesList.innerHTML = favoriteIdeas.map(idea => `
	<div class="bg-white/10 p-4 rounded-2xl hover:bg-white/20 transition-all duration-300" data-search="${idea.industry.toLowerCase()} ${idea.idea.toLowerCase()} ${idea.tags ? idea.tags.join(' ').toLowerCase() : ''}">
		<div class="flex justify-between items-start mb-3">
			<div>
				<div class="flex items-center space-x-2 mb-2">
					<span class="bg-yellow-500/30 text-white px-2 py-1 rounded-full text-xs">⭐ Favorite</span>
					<span class="bg-blue-500/30 text-white px-2 py-1 rounded-full text-xs">${idea.industry}</span>
					<span class="text-white/60 text-xs">$${idea.budget}</span>
					<span class="text-white/60 text-xs">${idea.timestamp}</span>
				</div>
			</div>
			<button onclick="removeFavorite(${idea.id})" class="text-red-400 hover:text-red-300 transition-colors">❌</button>
		</div>
		<p class="text-white mb-3 leading-relaxed">${idea.idea}</p>
		${idea.tags && idea.tags.length ? `
		<div class="mb-3 flex flex-wrap">
			${idea.tags.map(tag =>
		`<span class="tag tag-${['blue', 'green', 'purple', 'yellow', 'red'][Math.floor(Math.random() * 5)]}">${tag}</span>`
	).join('')}
		</div>` : ''}
		<div class="grid md:grid-cols-2 gap-4">
			<div>
				<h4 class="text-white font-semibold mb-2">🏷️ Brand Names:</h4>
				<ul class="text-white/80 text-sm space-y-1">
					${idea.names.map(name => `<li>• ${name}</li>`).join('')}
				</ul>
			</div>
			<div>
				<h4 class="text-white font-semibold mb-2">📱 Captions:</h4>
				<ul class="text-white/80 text-sm space-y-1">
					${idea.captions.map(caption => `<li>• "${caption}"</li>`).join('')}
				</ul>
			</div>
		</div>
	</div>
`).join('');
}

function removeFavorite(id) {
	favoriteIdeas = favoriteIdeas.filter(f => f.id !== id);
	const historyItem = ideaHistory.find(h => h.id === id);
	if (historyItem) historyItem.isFavorite = false;
	if (currentIdea && currentIdea.id === id) {
		currentIdea.isFavorite = false;
		updateCurrentFavoriteStar();
	}
	// Save to localStorage
	saveToLocalStorage();
	updateStats();
	updateFavoritesDisplay();
	updateHistoryDisplay();
	showToast('Removed from favorites');
}

function filterHistory() {
	const searchTerm = document.getElementById('searchHistory').value.toLowerCase();
	const items = document.querySelectorAll('#historyList [data-search]');

	items.forEach(item => {
		const searchData = item.getAttribute('data-search');
		if (searchData.includes(searchTerm)) {
			item.style.display = 'block';
		} else {
			item.style.display = 'none';
		}
	});
}

function filterFavorites() {
	const searchTerm = document.getElementById('searchFavorites').value.toLowerCase();
	const items = document.querySelectorAll('#favoritesList [data-search]');

	items.forEach(item => {
		const searchData = item.getAttribute('data-search');
		if (searchData.includes(searchTerm)) {
			item.style.display = 'block';
		} else {
			item.style.display = 'none';
		}
	});
}

function clearHistory() {
	if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
		ideaHistory = [];
		favoriteIdeas = [];
		currentIdea = null;

		// Clear localStorage
		localStorage.removeItem('businessIdeaHistory');
		localStorage.removeItem('businessIdeaFavorites');

		updateStats();
		updateHistoryDisplay();
		updateFavoritesDisplay();
		updateCurrentFavoriteStar();

		document.getElementById('results').classList.add('hidden');
		document.getElementById('searchHistory').value = '';
		document.getElementById('searchFavorites').value = '';

		showToast('History cleared');
	}
}
// Add to the existing script
let chatHistory = [];

function sendChatMessage() {
	const input = document.getElementById('chatInput');
	const message = input.value.trim();

	if (!message) return;

	// Add user message to chat
	addChatMessage('user', message);
	input.value = '';

	// Show loading indicator
	const loadingId = 'loading-' + Date.now();
	addChatMessage('assistant', 'Thinking...', loadingId);

	// Generate response
	generateChatResponse(message, loadingId);
}

function addChatMessage(role, content, id = null) {
	const chatMessages = document.getElementById('chatMessages');

	// Remove loading message if exists
	if (id && document.getElementById(id)) {
		document.getElementById(id).remove();
	}

	// Create message element
	const messageDiv = document.createElement('div');
	messageDiv.className = `mb-4 ${role === 'user' ? 'text-right' : 'text-left'}`;
	if (id) messageDiv.id = id;

	const bubble = document.createElement('div');
	bubble.className = `inline-block p-3 rounded-2xl max-w-xs md:max-w-md ${role === 'user' ? 'bg-blue-500 text-white' : 'bg-white/20 text-white'}`;
	bubble.textContent = content;

	messageDiv.appendChild(bubble);
	chatMessages.appendChild(messageDiv);

	// Scroll to bottom
	chatMessages.scrollTop = chatMessages.scrollHeight;

	// Add to chat history
	if (role === 'user' || !id) {
		chatHistory.push({ role, content });
	}
}

async function generateChatResponse(message, loadingId) {
	try {
		// Get context from current idea if available
		let context = '';
		if (currentIdea) {
			context = `Current business idea context: ${currentIdea.idea}. Industry: ${currentIdea.industry}. Budget: $${currentIdea.budget}.`;
		}

		const prompt = `You are a business consultant assistant. The user is working on a business idea. ${context}
	User question: ${message}
	Provide a helpful, concise response with practical advice.`;

		const res = await fetch(API_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				contents: [{ parts: [{ text: prompt }] }]
			})
		});

		const data = await res.json();
		const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
		// Update chat with response
		addChatMessage('assistant', text);
	} catch (e) {
		console.error("Chat error:", e);
		addChatMessage('assistant', "Sorry, I encountered an error. Please try again.");
	}
}

/* ---------------- */
// Add these to your existing script
let currentChatContext = null;

// Update the chat context dropdown when switching to chat tab
function updateChatContextSelect() {
	const select = document.getElementById('chatContextSelect');

	// Clear existing options except the first two
	while (select.options.length > 2) {
		select.remove(2);
	}

	// Add current idea option if available
	const currentOption = document.getElementById('currentIdeaOption');
	currentOption.style.display = currentIdea ? 'block' : 'none';

	// Add history items
	ideaHistory.forEach(idea => {
		const option = document.createElement('option');
		option.value = idea.id;
		option.className = 'bg-gray-800';
		option.textContent = `${idea.industry} ($${idea.budget}) - ${idea.timestamp}`;
		select.appendChild(option);
	});

	// Set current context if available
	if (currentChatContext) {
		select.value = currentChatContext.id || 'current';
	}
}

// Handle context selection change
document.getElementById('chatContextSelect').addEventListener('change', function () {
	const value = this.value;

	if (!value) {
		currentChatContext = null;
		return;
	}

	if (value === 'current') {
		currentChatContext = currentIdea ? {
			id: 'current',
			industry: currentIdea.industry,
			budget: currentIdea.budget,
			idea: currentIdea.idea
		} : null;
	} else {
		const selectedIdea = ideaHistory.find(idea => idea.id === parseInt(value));
		currentChatContext = selectedIdea ? {
			id: selectedIdea.id,
			industry: selectedIdea.industry,
			budget: selectedIdea.budget,
			idea: selectedIdea.idea
		} : null;
	}

	// Update chat header to show current context
	updateChatContextHeader();
});

function updateChatContextHeader() {
	const header = document.querySelector('#chat-tab h2');
	if (currentChatContext) {
		header.innerHTML = `💬 Discussing: <span class="text-blue-300">${currentChatContext.industry} ($${currentChatContext.budget})</span>`;
	} else {
		header.textContent = '💬 Business Idea Assistant';
	}
}

// Modified sendChatMessage function
async function sendChatMessage() {
	const input = document.getElementById('chatInput');
	const message = input.value.trim();

	if (!message) return;

	// Add user message to chat
	addChatMessage('user', message);
	input.value = '';

	// Show loading indicator
	const loadingId = 'loading-' + Date.now();
	addChatMessage('assistant', 'Thinking...', loadingId);

	// Generate response with context
	await generateChatResponse(message, loadingId);
}

// Enhanced generateChatResponse function
async function generateChatResponse(message, loadingId) {
	try {
		// Build context string
		let context = '';
		if (currentChatContext) {
			context = `Current business context: ${currentChatContext.idea}. Industry: ${currentChatContext.industry}. Budget: $${currentChatContext.budget}.`;
		}

		// Include previous chat messages for context (last 3 exchanges)
		const recentChatHistory = chatHistory.slice(-6); // Last 3 pairs of messages
		const chatContext = recentChatHistory.map(msg =>
			`${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
		).join('\n');

		const prompt = `You are a business consultant assistant. The user is discussing a business idea.

	${context}

	Previous conversation context:
	${chatContext}

	User's new question: ${message}

	Provide a helpful, concise response with practical advice. If the question relates to the business idea context, focus your answer specifically on that idea.`;

		const res = await fetch(API_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				contents: [{ parts: [{ text: prompt }] }]
			})
		});

		const data = await res.json();
		const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

		// Update chat with response
		addChatMessage('assistant', text);

	} catch (e) {
		console.error("Chat error:", e);
		addChatMessage('assistant', "Sorry, I encountered an error. Please try again.");
	}
}
