export const styles = `
  @keyframes dropBounce {
    0% { transform: translateY(-25px); }
    70% { transform: translateY(5px); }
    85% { transform: translateY(-2px); }
    100% { transform: translateY(0); }
  }

  @keyframes scaleIn {
    0% { transform: scale(0); }
    70% { transform: scale(1.25); }
    100% { transform: scale(1); }
  }

  @keyframes scaleOut {
    0% { transform: scale(1); }
    30% { transform: scale(1.15); }
    100% { transform: scale(0); }
  }

  @keyframes flash {
    0% { filter: brightness(1); }
    50% { filter: brightness(1.5); }
    100% { filter: brightness(1); }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-30px); }
    75% { transform: translateX(20px); }
  }

  @keyframes glow {
    0% { box-shadow: 0 0 5px rgba(255,255,255,0.5); }
    50% { box-shadow: 0 0 20px rgba(255,255,255,0.8); }
    100% { box-shadow: 0 0 5px rgba(255,255,255,0.5); }
  }

  @keyframes random-rotation {
    0% { transform: rotate(0deg); }
    25% { transform: rotate(3deg); }
    50% { transform: rotate(-3deg); }
    75% { transform: rotate(1deg); }
    100% { transform: rotate(0deg); }
  }

  .animate-drop {
    animation: dropBounce 0.2s ease-out;
  }

  .animate-scale-in {
    animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .animate-scale-out {
    animation: scaleOut 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .animate-flash {
    animation: flash 0.3s ease-in-out;
  }

  .animate-shake {
    animation: shake 0.3s ease-in-out;
  }

  .animate-glow {
    animation: glow 1s ease-in-out infinite;
  }

  .animate-random-rotation {
    animation: random-rotation 1s ease-in-out infinite; /* Adjust duration as needed */
  }

  .effect-active {
    transition: all 0.3s ease;
  }

  .effect-giant {
    filter: brightness(1.5);
    box-shadow: 0 0 15px rgba(147, 51, 234, 0.5);
  }

  .effect-ghost {
    opacity: 0.7;
    filter: brightness(1.1);
  }

  .effect-invert {
    animation: flash 0.3s ease-in-out;
  }

  .effect-scramble {
    animation: shake 0.3s ease-in-out;
  }

  .effect-lock {
    filter: brightness(1);
    opacity: 0.75;
  }

  .effect-double {
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
  }
`;
