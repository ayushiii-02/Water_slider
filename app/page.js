"use client";

import { useEffect, useRef } from "react";
import Sketch from "../js/app";

export default function HomePage() {
  const containerRef = useRef(null);
  const spacerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !spacerRef.current) return undefined;

    const sketch = new Sketch({
      dom: containerRef.current,
      scrollSpacer: spacerRef.current,
    });

    return () => {
      sketch.destroy();
    };
  }, []);

  return (
    <>
      <div id="container" ref={containerRef} />
      <div id="scroll-spacer" ref={spacerRef} />
    </>
  );
}
