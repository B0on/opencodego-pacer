export function SignInCTA() {
  const handleClick = () => {
    void chrome.tabs.create({ url: "https://opencode.ai/console" });
  };

  return (
    <div className="signin">
      <p className="signin__title">Sign in to opencode.ai</p>
      <p className="signin__sub">Open opencode.ai in Chrome and sign in to your Go account.</p>
      <button type="button" className="signin__button" onClick={handleClick}>
        Open opencode.ai
      </button>
    </div>
  );
}
