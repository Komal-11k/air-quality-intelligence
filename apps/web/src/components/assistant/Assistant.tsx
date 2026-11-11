"use client";

import { useState } from "react";
import { AssistantButton } from "./AssistantButton";
import { AssistantPanel } from "./AssistantPanel";

export const Assistant = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen && (
        <AssistantPanel onClose={() => setIsOpen(false)} />
      )}

      <AssistantButton
        isOpen={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      />
    </>
  );
};