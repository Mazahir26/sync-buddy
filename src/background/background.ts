import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, updateProfile } from "firebase/auth";
import {
  getFirestore,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  or,
  setDoc,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

// Enter your Firebase project configuration values here
const firebaseConfig = {
  // apiKey: "", // Your Firebase API key
  // authDomain: "", // Your Firebase Auth domain
  // projectId: "", // Your Firebase project ID
  // storageBucket: "", // Your Firebase storage bucket
  // messagingSenderId: "", // Your Firebase messaging sender ID
  // appId: "", // Your Firebase app ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "getAccount") {
    sendResponse({ data: auth.currentUser });
    return false;
  }

  if (request.action === "getUser") {
    (async () => {
      const user = auth.currentUser;
      if (!user) {
        sendResponse();
        return;
      }
      try {
        const roomsRef = collection(db, "rooms");
        const q = query(
          roomsRef,
          where("users", "array-contains", auth.currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        if (querySnapshot.docs[0].exists) {
          const room = querySnapshot.docs[0].data();
          if (room.users.includes(user.uid) || room.user == user.uid) {
            const [tab] = await chrome.tabs.query({
              active: true,
              currentWindow: true,
            });
            await chrome.storage.local.set({
              code: room.code,
              url: room.url,
              id: querySnapshot.docs[0].id,
            });

            sendResponse({ data: user, room: [room] });
            return;
          }
        }
        throw new Error("Room not found");
      } catch (err) {
        console.log("Room Not found Long query");
      }
      sendResponse({
        data: user,
        room: [],
      });
    })();
    return true;
  }

  if (request.action === "createUser") {
    const data = request.data;
    if (data.username) {
      (async () => {
        try {
          const user = await signInAnonymously(auth);
          await updateProfile(user.user, { displayName: data.username });
          sendResponse({ user: user.user });
        } catch (error) {
          console.log("Firebase Auth Error");
          console.log(error);
        }
      })();
    }
    return true;
  }

  if (request.action === "createRoom") {
    if (!request.data) {
      sendResponse();
      return false;
    }
    const name = request.data.roomId;
    (async () => {
      try {
        const user = auth.currentUser;
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const url = tab.url;

        if (url && name && user) {
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          const res = await chrome.tabs.sendMessage(tab.id, {
            action: "getPlayerInfo",
          });
          try {
            await setDoc(
              doc(db, "rooms", auth.currentUser.uid),
              {
                user: user.uid,
                url: url,
                users: [user.uid],
                play_state: res.paused ? "paused" : "playing",
                code: name,
                timestamp: res.timeStamp,
              },
              { merge: true }
            );
            await chrome.storage.local.set({
              code: name,
              url: url,
              id: user.uid,
            });
            await chrome.tabs.sendMessage(tab.id, {
              action: "partyOn",
            });
            sendResponse({
              data: {
                user: user.uid,
                url: url,
                users: [user.uid],
                play_state: res.paused ? "paused" : "playing",
                code: name,
                timestamp: res.timeStamp,
              },
            });
            return;
          } catch (err) {
            sendResponse({ err: "Something went wrong" });
          }
        }
      } catch (error) {
        console.log(error);
        sendResponse();
      }
    })();
    return true;
  }

  if (request.action === "joinRoom") {
    if (!request.data) {
      sendResponse();
      return false;
    }
    const name = request.data.roomId;
    (async () => {
      try {
        const user = auth.currentUser;
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const url = tab.url;
        const roomsRef = collection(db, "rooms");
        const q = query(roomsRef, where("code", "==", name));

        const querySnapshot = await getDocs(q);
        if (querySnapshot.docs[0].exists) {
          if (querySnapshot.docs[0].data().url != url) {
            sendResponse({ err: "Invalid Room" });
            return;
          }
          const room = querySnapshot.docs[0].data();
          if (room.users.includes(user.uid) || room.user == user.uid) {
            await chrome.storage.local.set({
              code: name,
              url: url,
              id: querySnapshot.docs[0].id,
            });
            await chrome.tabs.sendMessage(tab.id, {
              action: "partyOn",
            });
            sendResponse({ data: user, room: [room] });
            return;
          }
          await updateDoc(doc(db, "rooms", querySnapshot.docs[0].id), {
            users: arrayUnion(user.uid),
          });
          await chrome.storage.local.set({
            code: name,
            url: url,
            id: querySnapshot.docs[0].id,
          });
          await chrome.tabs.sendMessage(tab.id, {
            action: "partyOn",
          });

          sendResponse({ data: room });
        } else {
          sendResponse({ err: "Room not found" });
        }
      } catch (error) {
        sendResponse();
      }
    })();
    return true;
  }

  if (request.action === "deleteRoom") {
    if (!request.data) {
      sendResponse();
      return false;
    }
    const name = request.data.roomId;

    (async () => {
      try {
        const roomsRef = collection(db, "rooms");
        const q = query(roomsRef, where("code", "==", name));

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.docs[0].exists) {
          sendResponse({ err: "No room found" });
          return;
        }

        const room = querySnapshot.docs[0].data();
        if (!(room.user === auth.currentUser.uid)) {
          sendResponse({ err: "Invalid Room" });
          return;
        }
        await deleteDoc(doc(db, "rooms", querySnapshot.docs[0].id));
        await chrome.storage.local.remove("code");
        await chrome.storage.local.remove("id");
        await chrome.storage.local.remove("url");

        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        await chrome.tabs.sendMessage(tab.id, {
          action: "partyOff",
        });

        (async () => {
          const q = query(
            collection(db, "messages"),
            where("roomId", "==", querySnapshot.docs[0].id)
          );
          const docsRef = await getDocs(q);
          const batch = writeBatch(db);

          docsRef.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
        })();

        sendResponse({ data: "Done" });
      } catch (error) {
        console.log(error);
        sendResponse();
      }
    })();
  }
  if (request.action === "leaveRoom") {
    if (!request.data) {
      sendResponse();
      return false;
    }
    const name = request.data.roomId;

    (async () => {
      try {
        const roomsRef = collection(db, "rooms");
        const q = query(roomsRef, where("code", "==", name));

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.docs[0].exists) {
          sendResponse({ err: "No room found" });
          return;
        }
        const room = querySnapshot.docs[0].data();
        if (!room.users.includes(auth.currentUser.uid)) {
          sendResponse({ err: "Invalid Room" });
          return;
        }
        const r = await updateDoc(doc(db, "rooms", querySnapshot.docs[0].id), {
          users: arrayRemove(auth.currentUser.uid),
        });
        await chrome.storage.local.remove("code");
        await chrome.storage.local.remove("id");
        await chrome.storage.local.remove("url");
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        await chrome.tabs.sendMessage(tab.id, {
          action: "partyOff",
        });

        sendResponse({ data: "Done" });
      } catch (error) {
        sendResponse();
      }
    })();
  }

  if (request.action === "play") {
    if (!request.data) {
      sendResponse();
      return false;
    }
    (async () => {
      try {
        const id = (await chrome.storage.local.get("id")).id;
        if (!id) {
          sendResponse();
          return;
        }
        const roomRef = doc(db, "rooms", id);
        const roomDoc = await getDoc(roomRef);
        if (!roomDoc.exists()) {
          console.log("No room found");
          sendResponse({ err: "No room found" });
          return;
        }

        const room = roomDoc.data();

        if (
          room.play_state == "playing" &&
          Math.abs(request.data - room.timestamp) < 2
        ) {
          sendResponse({ room: room });
          return;
        }

        let seek = room.timestamp;
        if (Math.abs(request.data - room["timestamp"]) > 1.5) {
          seek = request.data;
        }
        await updateDoc(doc(db, "rooms", roomDoc.id), {
          play_state: "playing",
          timestamp: seek,
          updatedBy: auth.currentUser.uid,
        });

        sendResponse({
          room: {
            ...room,
            play_state: "playing",
            timestamp: seek,
            updatedBy: auth.currentUser.uid,
          },
        });
      } catch (error) {
        console.log(error);
        sendResponse();
      }
    })();
    return true;
  }

  if (request.action === "pause") {
    if (!request.data) {
      sendResponse();
      return false;
    }
    (async () => {
      try {
        const id = (await chrome.storage.local.get("id")).id;
        if (!id) {
          sendResponse();
          return;
        }
        const roomRef = doc(db, "rooms", id);
        const roomDoc = await getDoc(roomRef);
        if (!roomDoc.exists()) {
          console.log("No room found");
          sendResponse({ err: "No room found" });
          return;
        }

        const room = roomDoc.data();

        if (
          room.play_state == "paused" &&
          Math.abs(request.data - room.timestamp) < 2
        ) {
          sendResponse({ room: room });
          return;
        }

        let seek = room.timestamp;
        if (Math.abs(request.data - room["timestamp"]) > 1.5) {
          seek = request.data;
        }
        await updateDoc(doc(db, "rooms", roomRef.id), {
          play_state: "paused",
          timestamp: seek,
          updatedBy: auth.currentUser.uid,
        });

        sendResponse({
          room: {
            ...room,
            play_state: "paused",
            timestamp: seek,
            updatedBy: auth.currentUser.uid,
          },
        });
      } catch (error) {
        sendResponse();
      }
    })();
    return true;
  }

  if (request.action === "seek") {
    if (!request.data) {
      sendResponse();
      return false;
    }
    (async () => {
      try {
        const id = (await chrome.storage.local.get("id")).id;
        if (!id) {
          sendResponse();
          return;
        }
        const roomRef = doc(db, "rooms", id);
        const roomDoc = await getDoc(roomRef);
        if (!roomDoc.exists()) {
          console.log("No room found");
          sendResponse({ err: "No room found" });
          return;
        }

        const room = roomDoc.data();
        if (Math.abs(request.data - room["timestamp"]) < 2) {
          sendResponse({ room: room });
          return;
        }

        await updateDoc(doc(db, "rooms", roomRef.id), {
          timestamp: request.data,
          updatedBy: auth.currentUser.uid,
        });

        sendResponse({
          room: {
            ...room,
            timestamp: request.data,
            updatedBy: auth.currentUser.uid,
          },
        });
      } catch (error) {
        sendResponse();
      }
    })();
    return true;
  }

  if (request.action === "sendMessage") {
    const message = request.data.message;
    (async () => {
      const username = auth.currentUser.displayName ?? "User";
      const roomId = (await chrome.storage.local.get("id")).id;

      if (username && roomId) {
        if (message.startsWith("/")) {
          try {
            await addDoc(collection(db, "messages"), {
              roomId: roomId,
              message: message,
              user: username,
              userId: auth.currentUser.uid,
              timestamp: serverTimestamp(),
              type: "emoji",
            });
          } catch (error) {
            console.log(error);
          }
        } else {
          try {
            await addDoc(collection(db, "messages"), {
              roomId: roomId,
              message: message,
              user: username,
              userId: auth.currentUser.uid,
              timestamp: serverTimestamp(),
              type: "message",
            });
          } catch (error) {
            console.log(error);
          }
        }
      }
    })();
    return true;
  }
});
