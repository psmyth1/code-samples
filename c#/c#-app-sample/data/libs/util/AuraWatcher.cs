using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading;
using System.Timers;
using System.IO;
using System.Text.RegularExpressions;
using System.Security.Permissions;
using System.Reflection;
using System.Windows.Forms;

using Styx;
using Styx.Common;
using Styx.CommonBot;
using Styx.CommonBot.Inventory;
using Styx.CommonBot.POI;
using Styx.CommonBot.Routines;
using Styx.Helpers;
using Styx.Pathing;
using Styx.WoWInternals;
using Styx.WoWInternals.WoWObjects;

namespace FTWRev.data.libs.util
{
    public static class AuraWatcher
    {
        private static Dictionary<string, WoWAura> auras = new Dictionary<string, WoWAura>();
        private static int lasthealth = 0;
        private static DateTime lastauraupdate;
        private static DateTime LastCombat = DateTime.Now;

        public static void Pulse()
        {
            int currenthealth = (int)StyxWoW.Me.HealthPercent;
            DateTime currenttime = DateTime.Now;
            double healthchange = currenthealth - lasthealth;
            double elapsedms = (currenttime - lastauraupdate).TotalMilliseconds;

            double r = healthchange * 1000 / elapsedms;
            //if (r < 0)
            //    debug(Color.Orange, "Current health: {0:0.0}, Last health: {1:0.0}, Diff: {2:0.0}, Ms: {3:0.0}, Rate: {4:0.0} ", currenthealth, lasthealth, healthchange, elapsedms, r);

            lasthealth = currenthealth;
            lastauraupdate = currenttime;

            foreach (WoWAura aura in StyxWoW.Me.Auras.Values.ToList())
            {
                if (!auras.ContainsKey(aura.Name))
                {
                    if (aura.TimeLeft.TotalSeconds > 0)
                    {
                        if (aura.IsHarmful)
                            FTWLogger.debug(Color.Pink, "+++ {0} - {1} stacks, {2:0.0} seconds remaining", aura.Name, aura.StackCount, aura.TimeLeft.TotalSeconds);
                        else
                            FTWLogger.debug(Color.LightGreen, "+++ {0} - {1} stacks, {2:0.0} seconds remaining", aura.Name, aura.StackCount, aura.TimeLeft.TotalSeconds);
                        auras[aura.Name] = aura;
                    }
                }
            }

            foreach (WoWAura aura in auras.Values.ToList())
            {
                if (!StyxWoW.Me.Auras.ContainsKey(aura.Name))
                {
                    FTWLogger.debug(Color.Gray, "----- {0}", aura.Name);
                    auras.Remove(aura.Name);
                }
            }
        }
    }
}
