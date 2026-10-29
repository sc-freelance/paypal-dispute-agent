// UI choice 12A: a thin highlighter strip shown only when the backend says DEMO_MODE is on.
// The Reset demo button gets wired up with seed_demo later; for now it's shown disabled.
export default function DemoStrip() {
  return (
    <div className="demo-strip" role="note">
      <span>
        <b>DEMO MODE</b> · sandbox only · no real money moves
      </span>
      <button className="demo-reset" type="button" disabled title="Coming with seed_demo">
        Reset demo
      </button>
    </div>
  )
}
