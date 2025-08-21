// /src/core/rng.js
// Deterministic RNG (LCG) used across systems; single source of randomness.
export class RNG {
  constructor(seed = 123456789) { this.state = BigInt(seed >>> 0); }
  next() {
    this.state = (6364136223846793005n * this.state + 1442695040888963407n) & ((1n<<64n)-1n);
    return Number(this.state >> 11n) / Number(1n<<53n);
  }
  int(min, max){ return Math.floor(this.next() * (max - min + 1)) + min; }
  choice(arr){ return arr[this.int(0, arr.length-1)]; }
  shuffle(arr){
    for (let i=arr.length-1;i>0;i--){ const j = Math.floor(this.next()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    return arr;
  }
}
