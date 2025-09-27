const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("ACGC", (m) => {
  const hubV2 = m.getParameter("hubV2");
  const scopeSeed = m.getParameter("scopeSeed");
  const rawCfg = m.getParameter("rawCfg");

  const acgc = m.contract("ACGC", [hubV2, scopeSeed, rawCfg]);

  return { acgc };
});