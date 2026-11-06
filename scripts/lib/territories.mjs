// The 27 EU member states, as App Store Connect territory ids (ISO 3166-1 alpha-3).
// Owner decision (docs/AVAILABILITY.md): not a "trader" under the EU Digital Services Act, so the EU is left out at launch.
export const EU_MEMBERS = [
  ['AUT', 'Austria'], ['BEL', 'Belgium'], ['BGR', 'Bulgaria'], ['HRV', 'Croatia'], ['CYP', 'Cyprus'], ['CZE', 'Czechia'],
  ['DNK', 'Denmark'], ['EST', 'Estonia'], ['FIN', 'Finland'], ['FRA', 'France'], ['DEU', 'Germany'], ['GRC', 'Greece'],
  ['HUN', 'Hungary'], ['IRL', 'Ireland'], ['ITA', 'Italy'], ['LVA', 'Latvia'], ['LTU', 'Lithuania'], ['LUX', 'Luxembourg'],
  ['MLT', 'Malta'], ['NLD', 'Netherlands'], ['POL', 'Poland'], ['PRT', 'Portugal'], ['ROU', 'Romania'], ['SVK', 'Slovakia'],
  ['SVN', 'Slovenia'], ['ESP', 'Spain'], ['SWE', 'Sweden']
].map(([code, name]) => ({ code, name }));
export const EU_CODES = new Set(EU_MEMBERS.map(t => t.code));
