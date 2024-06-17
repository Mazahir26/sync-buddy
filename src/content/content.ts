import { initializeApp } from "firebase/app";
import type { User } from "firebase/auth";
import JSConfetti from "js-confetti";
const firebaseConfig = {
  // apiKey: "", // Your Firebase API key
  // authDomain: "", // Your Firebase Auth domain
  // projectId: "", // Your Firebase project ID
  // storageBucket: "", // Your Firebase storage bucket
  // messagingSenderId: "", // Your Firebase messaging sender ID
  // appId: "", // Your Firebase app ID
};

import {
  getFirestore,
  doc,
  onSnapshot,
  query,
  collection,
  where,
  orderBy,
} from "firebase/firestore";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let unSub: undefined | (() => void);
let timeoutUnSub: undefined | (() => void);
let unSubMessage: undefined | (() => void);
function checkValidity() {
  const videos = document.querySelectorAll("video");
  return videos.length > 0;
}

async function checkRealTime() {
  if (unSub) {
    unSub();
  }
  if (timeoutUnSub) {
    timeoutUnSub();
  }
  if (unSubMessage) {
    unSubMessage();
  }
  const roomId = (await chrome.storage.local.get("id")).id;
  const url = (await chrome.storage.local.get("url")).url;
  const user: User = (
    await chrome.runtime.sendMessage({
      action: "getAccount",
    })
  ).data;

  if (roomId && url) {
    if (url == window.location.href) {
      addListeners();
      // addIntervalUpdate();
      addChat();
      messageRealtime(roomId, user);
      firebaseRealTime(roomId, user);
    }
  }
}

function messageRealtime(id: string, user: User) {
  const jsConfetti = new JSConfetti();

  const q = query(
    collection(db, "messages"),
    where("roomId", "==", id),
    orderBy("timestamp", "asc")
  );
  unSubMessage = onSnapshot(q, (querySnapshot) => {
    querySnapshot.forEach((doc) => {
      const message = doc.data();
      if (message.type === "message") {
        sendM(
          message.message,
          message.user,
          doc.id,
          user.uid == message.userId,
          message.timestamp
        );
      } else if (message.type === "emoji") {
        const currentTime = new Date();
        const fewSecondsAgo = new Date(currentTime.getTime() - 1500);
        if (message.message == "/heart") {
          if (
            Math.abs(
              new Date(message.timestamp.seconds * 1000).getTime() -
                fewSecondsAgo.getTime()
            ) <= 1300
          ) {
            jsConfetti.addConfetti({
              emojis: ["❤️"],
            });
          }
          sendM(
            "❤️",
            message.user,
            doc.id,
            user.uid == message.userId,
            message.timestamp
          );
        } else if (message.message == "/laugh") {
          if (
            Math.abs(
              new Date(message.timestamp.seconds * 1000).getTime() -
                fewSecondsAgo.getTime()
            ) <= 1300
          ) {
            jsConfetti.addConfetti({
              emojis: ["😂", "🤣"],
            });
          }
          sendM(
            "😂",
            message.user,
            doc.id,
            user.uid == message.userId,
            message.timestamp
          );
        } else if (message.message == "/sad") {
          if (
            Math.abs(
              new Date(message.timestamp.seconds * 1000).getTime() -
                fewSecondsAgo.getTime()
            ) <= 1300
          ) {
            jsConfetti.addConfetti({
              emojis: ["😭", "😢"],
            });
          }
          sendM(
            "😭",
            message.user,
            doc.id,
            user.uid == message.userId,
            message.timestamp
          );
        } else if (message.message == "/shock") {
          if (
            Math.abs(
              new Date(message.timestamp.seconds * 1000).getTime() -
                fewSecondsAgo.getTime()
            ) <= 1300
          ) {
            jsConfetti.addConfetti({
              emojis: ["😯", "🤨", "😶"],
            });
          }
          sendM(
            "😯",
            message.user,
            doc.id,
            user.uid == message.userId,
            message.timestamp
          );
        } else if (message.message == "/damn") {
          if (
            Math.abs(
              new Date(message.timestamp.seconds * 1000).getTime() -
                fewSecondsAgo.getTime()
            ) <= 1300
          ) {
            jsConfetti.addConfetti({
              emojis: ["🤦‍♂️", "🫠", "🤦‍♀️"],
            });
          }
          sendM(
            "🤦‍♂️",
            message.user,
            doc.id,
            user.uid == message.userId,
            message.timestamp
          );
        } else {
          sendM(
            message.message,
            message.user,
            doc.id,
            user.uid == message.userId,
            message.timestamp
          );
        }
      }
    });
  });
}
function addIntervalUpdate() {
  const int = setInterval(() => {
    const videos = document.querySelectorAll("video");
    if (videos.length) {
      if (videos[0].paused) {
        chrome.runtime.sendMessage({
          action: "pause",
          data: videos[0].currentTime,
        });
      } else {
        chrome.runtime.sendMessage({
          action: "play",
          data: videos[0].currentTime,
        });
      }
    }
  }, 6000);

  timeoutUnSub = () => {
    clearInterval(int);
  };
}

function addListeners() {
  const videos = document.querySelectorAll("video");
  videos[0].addEventListener("play", () => {
    chrome.runtime.sendMessage({
      action: "play",
      data: videos[0].currentTime,
    });
  });

  videos[0].addEventListener("pause", () => {
    chrome.runtime.sendMessage({
      action: "pause",
      data: videos[0].currentTime,
    });
  });

  videos[0].addEventListener("seek", () => {
    if (videos[0].paused) {
      chrome.runtime.sendMessage({
        action: "pause",
        data: videos[0].currentTime,
      });
    } else {
      chrome.runtime.sendMessage({
        action: "play",
        data: videos[0].currentTime,
      });
    }
  });
}

const observer = new MutationObserver((mutationsList) => {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeName && node.nodeName.toLowerCase() === "video") {
          if (checkValidity()) {
            checkRealTime();
          }
        }
      });
    } else if (
      mutation.type === "attributes" &&
      mutation.target.nodeName.toLowerCase() === "video"
    ) {
      if (checkValidity()) {
        checkRealTime();
      }
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["src"],
});

window.addEventListener("load", () => {
  if (checkValidity()) {
    checkRealTime();
  }
});

window.addEventListener("beforeunload", () => {
  if (unSub) {
    unSub();
  }
  if (timeoutUnSub) {
    timeoutUnSub();
  }
  if (unSubMessage) {
    unSubMessage();
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "checkValidity") {
    sendResponse({ isValid: checkValidity() });
    return;
  }

  if (request.action === "getPlayerInfo") {
    const videos = document.querySelectorAll("video");
    if (!videos.length) {
      sendResponse({ timeStamp: 0, paused: true });
      return;
    }
    sendResponse({
      timeStamp: videos[0].currentTime,
      paused: videos[0].paused,
    });
    return;
  }
  if (request.action === "partyOff") {
    if (unSub) {
      unSub();
    }
    if (timeoutUnSub) {
      timeoutUnSub();
    }
    if (unSubMessage) {
      unSubMessage();
    }
    removeChat();
    const videos = document.querySelectorAll("video");
    videos.forEach((video) => {
      const newVideo = video.cloneNode(true);
      video.parentNode.replaceChild(newVideo, video);
    });
  }

  if (request.action === "partyOn") {
    checkRealTime();
  }
});

async function firebaseRealTime(id: string, user: User) {
  unSub = onSnapshot(
    doc(db, "rooms", id),
    (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        onPlayerUpdate(data as any, user.uid);
      }
    },
    (error) => {
      console.log(error);
    }
  );
}

async function onPlayerUpdate(
  data: {
    timestamp: number;
    play_state: "playing" | "paused";
    user: string;
    users: string[];
    code: string;
    url: string;
    updatedBy: string;
  },
  userId: string
) {
  if (userId !== data.updatedBy) {
    const videos = document.querySelectorAll("video");
    videos.forEach((video) => {
      video.currentTime = data.timestamp;
      const curState = video.paused;
      if (curState && data.play_state == "playing") {
        video.play();
      } else if (!curState && data.play_state == "paused") {
        video.pause();
      }
    });
  }
}

function removeChat() {
  const chatBox = document.getElementById("chat-box");
  if (chatBox) {
    chatBox.remove();
  }
}

let chatBoxTimeout: number;

function hideChatBox() {
  if (
    document.getElementById("chat-box") &&
    document.getElementById("chat-input")
  ) {
    const chatBox = document.getElementById("chat-box") as HTMLDivElement;
    const chatInput = document.getElementById("chat-input") as HTMLInputElement;
    if (!chatBox.classList.contains("opacity-0")) {
      chatBox.classList.remove("opacity-100");
      chatBox.classList.add("opacity-0", "pointer-events-none");
    }
    chatInput.blur();
  }
}

function toggleChatBox() {
  if (document.getElementById("chat-box")) {
    const chatBox = document.getElementById("chat-box") as HTMLDivElement;

    if (chatBox.classList.contains("opacity-0")) {
      showChatBox();
    } else {
      hideChatBox();
    }
  }
}

function showChatBox() {
  if (
    document.getElementById("chat-box") &&
    document.getElementById("chat-input")
  ) {
    const chatBox = document.getElementById("chat-box") as HTMLDivElement;
    const chatInput = document.getElementById("chat-input") as HTMLInputElement;
    if (!chatBox.classList.contains("opacity-100")) {
      chatBox.classList.remove("opacity-0", "pointer-events-none");
      chatBox.classList.add("opacity-100");
      chatInput.focus();
    }
    resetChatBoxTimeout();
  }
}

function resetChatBoxTimeout() {
  clearTimeout(chatBoxTimeout);
  chatBoxTimeout = window.setTimeout(hideChatBox, 8000);
}

async function sendM(
  message: string,
  userName: string,
  id: string,
  isUser: boolean,
  time: string
) {
  if (document.getElementById("chat-box") === null) {
    return;
  }

  if (id) {
    if (document.getElementById(`message-${id}`)) {
      return;
    }
  }
  showChatBox();

  const messageContainer = document.createElement("div");
  messageContainer.setAttribute("id", `message-${id}`);
  messageContainer.classList.add(
    "flex",
    "justify-between",
    "items-start",
    "mb-2"
  );

  const messageContent = document.createElement("div");
  messageContent.classList.add(
    "p-2",
    isUser ? "bg-blue-600" : "bg-green-600",
    "rounded-lg",
    "text-white",
    "max-w-2/3",
    "break-all",
    "overflow-hidden"
  );
  messageContent.textContent = message;
  const messageInfo = document.createElement("div");
  messageInfo.classList.add("text-gray-400", "text-sm", "ml-2");
  messageInfo.textContent = `${getFormattedTime(time)} - ${userName}`;

  messageContainer.appendChild(messageContent);
  messageContainer.appendChild(messageInfo);
  document.getElementById("chat-messages")?.appendChild(messageContainer);

  document.getElementById("chat-messages").scrollTop =
    document.getElementById("chat-messages").scrollHeight;
}

function addChat() {
  if (document.getElementById("chat-box")) {
    return;
  }

  const chatBoxHtml = `
   <div id="chat-box" class="fixed z-[9999] bottom-20 right-0 m-4 w-80 bg-gray-800 bg-opacity-40 border border-gray-700 rounded-lg shadow-lg overflow-hidden transition-opacity duration-300 opacity-0 pointer-events-none">
  <div class="flex flex-col h-full">
    <div class="flex-1 p-2 overflow-y-auto text-white">
      <div id="chat-messages" class="h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700"></div>
    </div>
    <div class="p-2 border-t border-gray-700">
      <input id="chat-input" type="text" class="w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" placeholder="Type your message...">
    </div>
  </div>
</div>
  `;

  const chatBoxContainer = document.createElement("div");
  chatBoxContainer.innerHTML = chatBoxHtml;

  document.body.appendChild(chatBoxContainer);

  const chatBox = document.getElementById("chat-box") as HTMLDivElement;
  const chatInput = document.getElementById("chat-input") as HTMLInputElement;

  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.ctrlKey && e.key === "m") {
      e.preventDefault();
      toggleChatBox();
    }
    if (e.shiftKey && e.key === "Enter") {
      e.preventDefault();
      toggleChatBox();
    }
  });

  chatBox.addEventListener("mouseover", () => {
    clearTimeout(chatBoxTimeout);
  });
  chatBox.addEventListener("mouseout", resetChatBoxTimeout);
  chatBox.addEventListener("focusin", resetChatBoxTimeout);
  chatBox.addEventListener("focusout", resetChatBoxTimeout);

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const message = chatInput.value.trim();
      if (message) {
        chatInput.value = "";
        chrome.runtime.sendMessage({
          action: "sendMessage",
          data: {
            message,
          },
        });
        resetChatBoxTimeout();
      }
    } else {
      resetChatBoxTimeout();
    }
  });

  const tailwindScript = document.createElement("link");
  tailwindScript.href =
    "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css";
  tailwindScript.rel = "stylesheet";
  document.head.appendChild(tailwindScript);
}

function getFormattedTime(timestamp: any) {
  const now = new Date(timestamp.seconds * 1000);
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
