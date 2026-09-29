// Placeholder until the leaderboard grid is built.
export function IdleScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <main className="idle-screen">
      <button className="idle-screen__settings-button" onClick={onOpenSettings}>
        settings
      </button>
      <h1 className="idle-screen__title">git-aux</h1>
      <p className="idle-screen__status">waiting for events</p>
    </main>
  )
}
