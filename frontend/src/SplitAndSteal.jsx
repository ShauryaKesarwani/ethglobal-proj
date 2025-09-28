import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { ensureBaseSepolia } from "@/lib/networkGuard";
import { packChoices, makeSalt, makeCommitment } from "@/lib/sosHelpers";
import ErrorBoundary from "./ErrorBoundary";
import { Button } from "@/components/ui/button";

// ABIs built by hardhat, copy JSONs into src/abi
import SplitOrStealAbi from "@/abi/SplitOrSteal.json";

const SOS_ADDR = import.meta.env.VITE_SOS_ADDR; // set in .env
if (!SOS_ADDR) console.warn("VITE_SOS_ADDR not set");
// inject this from your Self session context; placeholder below:
const getNullifier = () => (window.__NULLIFIER__ || 0);

export default function StakeAndSteal() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [addr, setAddr] = useState("");

  const sos = useMemo(() => {
  if (!signer) return null;
  if (!SOS_ADDR) return null;

  // Optional debug prints to catch bad imports quickly:
  console.log("SplitOrStealArtifact:", SplitOrStealAbi);
  try {
    return new ethers.Contract(SOS_ADDR, SplitOrStealAbi.abi, signer);
  } catch (e) {
    console.error("Failed to build SplitOrSteal contract:", e);
    return null;
  }
}, [signer, SOS_ADDR]);

  // const sos = useMemo(() => {
  //   if (!signer) return null;
  //   return new ethers.Contract(SOS_ADDR, SplitOrStealAbi, signer);
  // }, [signer]);

  // Connect to MetaMask
  async function connectWallet() {
    try {
      const eth = window.ethereum;
      if (!eth) {
        console.warn("MetaMask not found");
        return;
      }
      await ensureBaseSepolia(eth);
      await eth.request({ method: "eth_requestAccounts" });
      const prov = new ethers.BrowserProvider(eth);
      setProvider(prov);
      const s = await prov.getSigner();
      setSigner(s);
      setAddr(await s.getAddress());
    } catch (e) {
      console.error("Init wallet failed:", e);
    }
  }

  useEffect(() => {
    connectWallet();
  }, []);

  // Logout function
  async function logout() {
    // clear local dapp state first
    setProvider(null);
    setSigner(null);
    setAddr("");

    const eth = window.ethereum;
    if (!eth) return;

    try {
      // 1) revoke current permission, so the next request triggers picker
      // (supported in modern MetaMask; ignore if not)
      await eth.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      });
    } catch (e) {
      console.warn("revokePermissions failed or not supported:", e);
    }

    try {
      // 2) immediately prompt account selection
      await eth.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });

      // optional: auto-reconnect after user picks
      await ensureBaseSepolia(eth);
      const prov = new ethers.BrowserProvider(eth);
      setProvider(prov);
      const s = await prov.getSigner();
      setSigner(s);
      setAddr(await s.getAddress());
    } catch (e) {
      // user may cancel — that’s fine, you stay “logged out”
      console.log("User canceled re-connect:", e);
    }
  }

  // UI state
  const [rooms, setRooms] = useState([]);
  const [stakeEth, setStakeEth] = useState("0.05");
  const [commitDLmin, setCommitDLmin] = useState(10);
  const [revealDLmin, setRevealDLmin] = useState(20);

  async function refreshRooms() {
    if (!sos) return;
    try {
      const list = await sos.listJoinable(1n, 50);
      setRooms(list.map((x) => Number(x)));
    } catch (e) {
      console.error("listJoinable failed:", e);
    }
  }

  useEffect(() => { refreshRooms(); }, [sos]);

  async function createRoom() {
    if (!sos) return;
    try {
      const now = Math.floor(Date.now() / 1000);
      const commitDL = now + commitDLmin * 60;
      const revealDL = now + revealDLmin * 60;
      const stakeWei = ethers.parseEther(stakeEth);
      const tx = await sos.createRoom(
        stakeWei,
        commitDL,
        revealDL,
        getNullifier(),
        { value: stakeWei }
      );
      console.log("createRoom tx:", tx.hash);
      await tx.wait();
      await refreshRooms();
    } catch (e) {
      console.error("createRoom failed:", e);
      alert(`Create failed: ${(e && e.shortMessage) || e}`);
    }
  }

  async function joinRoom(roomId, stakeWei) {
    if (!sos) return;
    try {
      const tx = await sos.joinRoom(roomId, getNullifier(), { value: stakeWei });
      console.log("joinRoom tx:", tx.hash);
      await tx.wait();
    } catch (e) {
      console.error("joinRoom failed:", e);
      alert(`Join failed: ${(e && e.shortMessage) || e}`);
    }
  }

  // commit/reveal controls
  const [choices, setChoices] = useState([false, false, false, false, false]); // false=SPLIT, true=STEAL
  const [salt, setSalt] = useState(makeSalt());
  const [roomIdCR, setRoomIdCR] = useState("");

  function toggle(i) {
    setChoices((prev) => {
      const next = prev.slice();
      next[i] = !next[i];
      return next;
    });
  }

  async function doCommit() {
    if (!sos) return;
    if (!roomIdCR) return alert("Set room ID");
    try {
      const packed = packChoices(choices);
      const commitment = makeCommitment(BigInt(roomIdCR), packed, salt);
      const tx = await sos.commit(Number(roomIdCR), commitment, getNullifier());
      console.log("commit tx:", tx.hash);
      await tx.wait();
      alert("Committed!");
    } catch (e) {
      console.error("commit failed:", e);
      alert(`Commit failed: ${(e && e.shortMessage) || e}`);
    }
  }

  async function doReveal() {
    if (!sos) return;
    if (!roomIdCR) return alert("Set room ID");
    try {
      const packed = packChoices(choices);
      const tx = await sos.reveal(Number(roomIdCR), packed, salt, getNullifier());
      console.log("reveal tx:", tx.hash);
      await tx.wait();
      alert("Revealed!");
    } catch (e) {
      console.error("reveal failed:", e);
      alert(`Reveal failed: ${(e && e.shortMessage) || e}`);
    }
  }

  async function doSettle() {
    if (!sos) return;
    if (!roomIdCR) return alert("Set room ID");
    try {
      const tx = await sos.settle(Number(roomIdCR));
      console.log("settle tx:", tx.hash);
      await tx.wait();
      alert("Settled!");
    } catch (e) {
      console.error("settle failed:", e);
      alert(`Settle failed: ${(e && e.shortMessage) || e}`);
    }
  }

  async function doWithdraw() {
    if (!sos) return;
    try {
      const tx = await sos.withdraw();
      console.log("withdraw tx:", tx.hash);
      await tx.wait();
      alert("Withdrawn!");
    } catch (e) {
      console.error("withdraw failed:", e);
      alert(`Withdraw failed: ${(e && e.shortMessage) || e}`);
    }
  }

  return (
    <ErrorBoundary>
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stake&Steal</h1>
        <div className="flex items-center gap-2">
          <div className="text-sm opacity-80">{addr || "Connect MetaMask"}</div>
          {addr ? (
            <Button onClick={logout} size="sm" variant="outline" className="ml-2">Logout</Button>
          ) : (
            <Button onClick={connectWallet} size="sm" className="ml-2 bg-blue-600 text-white text-xs">Connect</Button>
          )}
        </div>
      </header>

      {/* Create Room */}
      <section className="rounded-2xl border p-4 space-y-3">
        <h2 className="font-semibold">Create room</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2">
            <span>Stake (ETH)</span>
            <input
              className="px-3 py-2 rounded-lg border w-full"
              value={stakeEth}
              onChange={(e) => setStakeEth(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2">
            <span>Commit DL (min)</span>
            <input
              type="number"
              className="px-3 py-2 rounded-lg border w-full"
              value={commitDLmin}
              onChange={(e) => setCommitDLmin(parseInt(e.target.value || "0", 10))}
            />
          </label>
          <label className="flex items-center gap-2">
            <span>Reveal DL (min)</span>
            <input
              type="number"
              className="px-3 py-2 rounded-lg border w-full"
              value={revealDLmin}
              onChange={(e) => setRevealDLmin(parseInt(e.target.value || "0", 10))}
            />
          </label>
        </div>
        <Button onClick={createRoom} className="bg-black text-white" size="lg">
          Create
        </Button>
      </section>

      {/* Joinable Rooms */}
      <section className="rounded-2xl border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Joinable rooms</h2>
          <Button onClick={refreshRooms} variant="outline" size="sm" className="text-sm underline">Refresh</Button>
        </div>
        <div className="grid gap-3">
          {rooms.length === 0 && <div className="text-sm opacity-70">No rooms yet.</div>}
          {rooms.map((rid) => (
            <RoomCard key={rid} roomId={rid} sos={sos} onJoin={joinRoom} />
          ))}
        </div>
      </section>

      {/* Commit/Reveal */}
      <section className="rounded-2xl border p-4 space-y-3">
        <h2 className="font-semibold">Commit & Reveal</h2>
        <div className="flex items-center gap-3">
          <input
            placeholder="Room ID"
            className="px-3 py-2 rounded-lg border w-32"
            onChange={(e) => setRoomIdCR(e.target.value)}
          />
          <Button variant="outline" size="sm" className="px-3 py-2 rounded-lg border" onClick={() => setSalt(makeSalt())}>
            New salt
          </Button>
          <span className="text-xs break-all opacity-70">{salt}</span>
        </div>
        <div className="flex gap-2">
          {choices.map((c, i) => (
            <Button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              variant="outline"
              size="sm"
              className={`px-4 py-2 rounded-xl border ${c ? "bg-red-100 border-red-300" : "bg-green-100 border-green-300"}`}
              title={c ? "STEAL" : "SPLIT"}
            >
              R{i + 1}: {c ? "STEAL" : "SPLIT"}
            </Button>
          ))}
        </div>
        <div className="flex gap-3">
          <Button onClick={doCommit} className="bg-blue-600 text-white" size="lg">Commit</Button>
          <Button onClick={doReveal} className="bg-purple-600 text-white" size="lg">Reveal</Button>
          <Button onClick={doSettle} className="bg-emerald-600 text-white" size="lg">Settle</Button>
          <Button onClick={doWithdraw} className="bg-neutral-800 text-white" size="lg">Withdraw</Button>
        </div>
      </section>
    </div>
    </ErrorBoundary>
  );
}

function RoomCard({ roomId, sos, onJoin }) {
  const [stake, setStake] = useState(0n);
  const [p1, setP1] = useState("");

  useEffect(() => {
    (async () => {
      if (!sos) return;
      try {
        const r = await sos.getRoom(roomId);
        setStake(r.stake);
        setP1(r.p1);
      } catch (e) {
        console.error("getRoom failed:", e);
      }
    })();
  }, [roomId, sos]);

  return (
    <div className="rounded-xl border p-3 flex items-center justify-between">
      <div>
        <div className="font-medium">Room #{roomId}</div>
        <div className="text-xs opacity-70">Host: {p1}</div>
        <div className="text-sm">Stake: {ethers.formatEther(stake)} ETH</div>
      </div>
      <Button
        onClick={() => onJoin(roomId, stake)}
        className="bg-black text-white"
        size="lg"
      >
        Join
      </Button>
    </div>
  );
}