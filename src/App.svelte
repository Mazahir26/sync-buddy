<script lang="ts">
  import { onMount } from "svelte";
  import "./tailwind.css";
  import type { Models } from "appwrite";
  import type { User } from "firebase/auth";

  let state:
    | "Loading"
    | "Logged In"
    | "Not Logged In"
    | "In-Party"
    | "isNotValid"
    | "Room Exist In different tab" = "Loading";
  let user: User | undefined = undefined;
  let username: string;
  let roomId: string;

  let error: string = "";
  let room: Models.Document | undefined = undefined;

  async function joinRoom() {
    if (!roomId) {
      error = "Please enter a room ID";
      return;
    }
    state = "Loading";
    chrome.runtime.sendMessage(
      { action: "joinRoom", data: { roomId } },
      function (response) {
        if (response.err) {
          state = "Logged In";
          error = response.err;
        } else {
          room = response.data;
          state = "In-Party";
        }
      }
    );
  }

  async function createRoom() {
    if (!roomId) {
      error = "Please enter a room ID";
      return;
    }
    state = "Loading";
    chrome.runtime.sendMessage(
      { action: "createRoom", data: { roomId } },
      function (response) {
        room = response.data;
        state = "In-Party";
      }
    );
  }

  async function login() {
    if (!username) {
      error = "Please enter a username";
      return;
    }
    if (username.length < 3) {
      error = "Username must be at least 3 characters";
      return;
    }
    state = "Loading";
    chrome.runtime.sendMessage(
      { action: "createUser", data: { username } },
      function (response) {
        user = response.data;
        state = "Logged In";
      }
    );
  }

  async function levRoom() {
    if (room?.user == user?.uid) {
      state = "Loading";
      chrome.runtime.sendMessage(
        { action: "deleteRoom", data: { roomId: room.code } },
        function (response) {
          state = "Logged In";
        }
      );
    } else {
      state = "Loading";
      chrome.runtime.sendMessage(
        { action: "leaveRoom", data: { roomId: room.code } },
        function (response) {
          state = "Logged In";
        }
      );
    }
  }

  onMount(() => {
    chrome.runtime.onMessage.addListener(
      function (request, sender, sendResponse) {
        if (request.action === "test") {
          console.log("test");
        }
      }
    );
    chrome.runtime.sendMessage({ action: "getUser" }, function (response) {
      if (response) {
        state = "Logged In";
        user = response.data;

        (async () => {
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (response.room.length > 0) {
            room = response.room[0];
            console.log(room);
            if (room.url != tab.url) {
              state = "Room Exist In different tab";
              room = room;
            }
          }
          const res = await chrome.tabs.sendMessage(tab.id, {
            action: "checkValidity",
          });
          if (!res.isValid) {
            state = "isNotValid";
          }
        })();

        if (response.room.length > 0) {
          room = response.room[0];
          state = "In-Party";
        }
      } else {
        state = "Not Logged In";
      }
    });
  });
</script>

<svelte:head>
  <title>You App Name</title>
  <link rel="stylesheet" href="/build/bundle.css" />
</svelte:head>

{#if state === "Loading"}
  <div class="h-36 w-36 flex items-center justify-center bg-gray-900">
    <div role="status ">
      <svg
        aria-hidden="true"
        class="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-gray-600"
        viewBox="0 0 100 101"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
          fill="currentColor"
        />
        <path
          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
          fill="currentFill"
        />
      </svg>
      <span class="sr-only">Loading...</span>
    </div>
  </div>
{:else if state === "Not Logged In"}
  <div class="bg-gray-900 p-6 w-56 h-full">
    <h1 class="block text-xl text-center font-bold text-gray-300 mb-6">
      Create a User
    </h1>
    <form>
      <div class="mb-4">
        <label for="username" class="block text-sm font-medium text-gray-300"
          >Username</label
        >
        <input
          type="text"
          id="username"
          name="username"
          bind:value={username}
          class="mt-1 block w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-300 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div class="flex items-center justify-center">
        <button
          on:click={login}
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >Submit</button
        >
      </div>
    </form>
  </div>
{:else if state === "Logged In"}
  <div class="bg-gray-900 p-6 w-96 h-full">
    <h1 class="block text-2xl text-center font-bold text-gray-300 mb-6">
      Welcome {user?.displayName ?? "User"}
    </h1>
    <h1 class="block text-xl text-center font-bold text-gray-300 mb-6">
      Create/Join a Room
    </h1>
    <form>
      <div class="mb-4">
        <label for="room-tag" class="block text-sm font-medium text-gray-300"
          >Room Name/Code</label
        >
        <input
          type="text"
          id="room-tag"
          name="room-tag"
          bind:value={roomId}
          class="mt-1 block w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-300 focus:ring-blue-500 focus:border-blue-500"
        />
        <p class="text-red-500 text-sm">{error}</p>
      </div>
      <div class="flex items-center gap-4 flex-row justify-center">
        <button
          on:click={joinRoom}
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >Join</button
        >
        <button
          on:click={createRoom}
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >Create</button
        >
      </div>
    </form>
  </div>
{:else if state === "In-Party"}
  <div
    class="bg-gray-900 w-72 flex justify-center flex-col py-9 items-center h-full"
  >
    <h1 class="block text-2xl text-center font-bold text-gray-300 mb-6">
      Hii!! {user?.displayName ?? "User"}
    </h1>
    <button
      on:click={levRoom}
      class="inline-flex items-center px-4 py-2 bg-red-600 transition ease-in-out delay-75 hover:bg-red-700 text-white text-sm font-medium rounded-md hover:-translate-y-1 hover:scale-110"
    >
      <svg
        stroke="currentColor"
        viewBox="0 0 24 24"
        fill="none"
        class="h-5 w-5 mr-2"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        ></path>
      </svg>
      {room.user == user.uid ? "Delete Room" : "Leave Room"}
    </button>

    <p class="text-gray-500 mt-3">
      Room Code : {room.code ?? ""}
    </p>
    <p class="text-gray-500">
      No of users : {room.users?.length ?? ""}
    </p>
  </div>
{:else if state === "isNotValid"}
  <div class="bg-gray-900 text-white px-6 py-4 shadow-md w-52 text-center">
    <h2 class="text-3xl font-bold mb-2">Error</h2>
    <p class="text-lg">Not Valid Page</p>
  </div>
{:else if state === "Room Exist In different tab"}
  <div class="bg-gray-900 text-white px-6 py-4 shadow-md w-52 text-center">
    <h2 class="text-3xl font-bold mb-2">Error</h2>
    <p class="text-lg">Room Exist</p>
    <p class="text-gray-400">Please go to that tab</p>
    <p>{room?.url ?? ""}</p>
  </div>
{/if}
