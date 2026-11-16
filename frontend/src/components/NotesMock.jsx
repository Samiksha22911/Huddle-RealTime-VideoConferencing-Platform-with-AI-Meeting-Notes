// Decorative illustration for the landing page, built from HTML/CSS (no image files needed).
const TILES = [
  ['AS', 'Asha', true],
  ['RK', 'Ravi', false],
  ['MP', 'Meera', false],
  ['YO', 'You', false],
];

export default function NotesMock() {
  return (
    <div className="mock" aria-hidden="true">
      <div className="mock-call">
        <div className="mock-grid">
          {TILES.map(([ini, label, speaking]) => (
            <div key={label} className={`mock-tile ${speaking ? 'is-speaking' : ''}`}>
              <span>{ini}</span>
              <small>{label}</small>
            </div>
          ))}
        </div>
        <p className="mock-caption"><strong>Asha</strong> I’ll send the design doc by Friday.</p>
      </div>
      <div className="mock-notes">
        <h4>Meeting notes</h4>
        <p>The team agreed to ship the beta next week and to fix the login bug first.</p>
        <ul>
          <li><i /> Send the design doc <small>Asha</small></li>
          <li><i /> Fix the login bug <small>Ravi</small></li>
          <li><i /> Book the demo room <small>Meera</small></li>
        </ul>
      </div>
    </div>
  );
}
