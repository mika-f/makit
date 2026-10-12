"use client";

import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <button
        type="button"
        onClick={() => setCount((value) => value + 1)}
        className="rounded-lg border px-4 py-2"
      >
        Clicked {count} time(s)
      </button>
    </div>
  );
}
