export function Frac({top, bot, color = 'currentColor', size = '1em'}) {

  return(
    <span style={{
      display: 'inline-flex', flexDirection: 'column',
      alignItems: 'center', verticalAlign: 'middle',
      fontSize: size, lineHeight: 1, margin: '0 2px'
    }}>
      <span style={{
        color, borderBottom: `1.5px solid ${color}`,
        paddingBottom: '1px', paddingLeft: '4px',
        paddingRight: '4px', textAlign: 'center'
      }}>
        {top}
      </span>
      <span style={{
        color, paddingTop: '2px',
        paddingLeft: '4px', paddingRight: '4px', textAlign: 'center'
      }}>
        {bot}
      </span>
    </span>
  );
}