
# 🥇 Stake&Steal: Play Fair, Win Big, Stay Real!

Welcome to **Stake&Steal** — where game theory meets real-world identity, and every round is a battle of trust, wit, and a dash of luck! Built for ETHGlobal, powered by Pyth Network's cosmic entropy, and protected by Self Protocol's ironclad identity, this is the next evolution of the classic Split or Steal game.

---

## 🎲 What is Stake&Steal?

Imagine a world where only real, verified humans can play for real stakes. No bots. No cheaters. Just you, your choices, and the thrill of the game. Stake&Steal is:

- 🔒 **Bot-proof**: Only Aadhaar/Passport-verified users (via Self Protocol) can play
- 🦊 **MetaMask-powered**: Connect your wallet and jump in
- 🎰 **Truly random**: Pyth Network entropy ensures every outcome is fair
- 🏆 **NFT rewards**: Winners get unique, on-chain trophies
- 🚫 **Zero tolerance for cheaters**: Get caught, get banned — for good

---

## 🕹️ How to Play

1. **Connect your MetaMask wallet**
2. **Verify your identity** with Self.xyz (Aadhaar or Passport — your choice!)
3. **Stake and play**: Enter the arena, play 5 rounds of Split or Steal, and outsmart your opponent
4. **Let fate decide**: At the end, Pyth entropy brings the randomness, and NFTs are minted for the victors
5. **Stay honest**: Cheaters are zapped by the admin panel and banned on-chain

---

## 🧩 How It Works (Under the Hood)

- ⚛️ **Frontend**: React.js + Vite + Tailwind CSS for a snappy, modern UI
- 📝 **Smart Contracts**:
  - `SplitOrSteal.sol`: The game engine
  - `PrizeNFT.sol`: Mints your victory
- 🪪 **Identity**: Self Protocol SDK + mobile app, storing user IDs on-chain
- 🎲 **Randomness**: Pyth Network entropy, called directly from the contract (no oracle middlemen!)
- 🌉 **Networks**: Celo (for identity), Base (for the game) — separate, no bridges

---

## 🏆 Game Mechanics

- 5 rounds per game, stake split into 5 parts
- Each round: choose to split or steal
- At the end: rewards distributed based on your choices
- Randomness is requested at game finish
- Only verified humans can play
- Cheaters? Banned by on-chain user ID, forever

---

## ⚡ Quickstart

1. **Clone this repo**
2. **Install dependencies** in each folder (`frontend`, `contracts`, etc.)
3. **Deploy contracts** to Base and Celo testnets
4. **Run the frontend**
5. **Verify yourself** with the Self app (Aadhaar/Passport)
6. **Connect MetaMask** and start playing!

---

## Folder Map

- `frontend/` — React app (UI, wallet, Self integration)
- `contracts/` — Solidity contracts for game and NFT
- `entropyseed/` — Entropy/randomness demo
- `seed-dapp/` — Dapp for randomness/entropy (demo)

---

## Our Team

- Shaurya Kesarwani
- Aayush Yadav
- Utakarsh Triparthi

---

## 🙏 Thanks & Credits

- ETHGlobal
- Pyth Network
- Self Protocol
