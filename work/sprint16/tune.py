# Balance numbers of sprint 16 (v1.0-rc10). ed.py reads this file. Old values (tray1) are in the comments; LOG.md has the full old -> new list.
FT_TRAY = 6        # first tomb: the seal is held until this many finds are on the tray (new)
FT_T3 = 7500       # first tomb: chamber 3 asks this until the profile has cleared a tomb (new; the full target is SKILL.targets[2])
BRUTE_HAM = 22     # Brute: crack a hammer swing costs (was 26)
FENCE_HAM = 11     # Fence: crack a hammer swing costs (was 12)
# Guardian chamber (chamber 3) target, as a change on the 9,000 base. tray1: II +5%, III +15%, IV 0, V +30%, VI +10%, VII -60%.
TW_ORACLE = .10    # Tomb II
TW_JELLING = -.10  # Tomb III
TW_TIKAL = -.05    # Tomb IV
TW_UR = -.12       # Tomb V
TW_KNOSSOS = .05   # Tomb VI
TW_ARMY = -.15     # Tomb VII
# Stake target multipliers, Stakes 1..6 (tray1: 1, 1, 1, 1.05, 1.10, 1.15) and the Long Dark's fourth chamber (share of the deep step; tray1: 0.75)
STAKE_T = [1, 1, 1, 1.05, 1.10, 1.15]
LONG4 = .75
