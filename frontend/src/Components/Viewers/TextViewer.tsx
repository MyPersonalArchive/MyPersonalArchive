import React, { useEffect, useRef, useState } from "react";

interface Props {
  src: string;
  style?: React.CSSProperties;
}

export const TextViewer = ({ src, style }: Props) => {
  const [text, setText] = useState<string>("");
  const [fontSize, setFontSize] = useState<number>(16);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    fetch(src)
      .then((r) => r.text())
      .then(setText)
      .catch(() => setText("Failed to load text file."));
  }, [src]);

  useEffect(() => {
    if (!text || !containerRef.current || !textRef.current) return;

    const container = containerRef.current;
    const pre = textRef.current;

    let newSize = fontSize;
    const maxSize = 24;
    const minSize = 8;

    // Reset to base size before measuring
    pre.style.fontSize = `${maxSize}px`;

	//Dynamically adjust fontsize depending on the size of the container
    const adjustFont = () => {
      while (
        (pre.scrollHeight > container.clientHeight ||
          pre.scrollWidth > container.clientWidth) &&
        newSize > minSize
      ) {
        newSize -= 1;
        pre.style.fontSize = `${newSize}px`;
      }
      setFontSize(newSize);
    };

    adjustFont();
  }, [text]);

  if (!text) return <div>Loading...</div>;

  return (
    <div
	  className="text-viewer-container"
      ref={containerRef}
      style={{
        overflow: "hidden",
        position: "relative",
        width: "100%",
        height: "100%",
        ...style,
      }}
    >
      <pre
        ref={textRef}
        style={{
          fontSize: `${fontSize}px`,
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          padding: "1rem",
          background: "#f9f9f9",
          borderRadius: "0.5rem",
          margin: 0,
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        {text}
      </pre>
    </div>
  );
};
