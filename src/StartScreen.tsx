export function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <button className="start-screen" onClick={onStart}>
      <span className="start-screen__title">git-aux</span>
      <span className="start-screen__hint">click anywhere to turn sound on</span>
    </button>
  )
}
