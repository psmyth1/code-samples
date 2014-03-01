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
    public static class MyTimer
    {
        private static Dictionary<string, DateTime> starts = new Dictionary<string, DateTime>();
        private static Dictionary<string, int> count = new Dictionary<string, int>();
        private static Dictionary<string, int> elapseds = new Dictionary<string, int>();
        private static DateTime nexttime = DateTime.Now;

        public static void Pulse()
        {
            if (DateTime.Now < nexttime)
                return;
            nexttime = DateTime.Now.AddSeconds(60);
            Display();
        }

        public static void Start(string s)
        {
            if (!starts.ContainsKey(s))
                starts.Add(s, DateTime.Now);
            else
                starts[s] = DateTime.Now;
        }

        public static void Stop(string s, bool displaynow = false)
        {
            int elapsedtime = (int)(DateTime.Now - starts[s]).TotalMilliseconds;
            if (!elapseds.ContainsKey(s))
            {
                elapseds.Add(s, elapsedtime);
                count.Add(s, 1);
            }
            else
            {
                elapseds[s] += elapsedtime;
                count[s] += 1;
            }
            if (displaynow && elapsedtime > 0)
            {
                FTWLogger.debug(Color.SeaShell, string.Format("-------------------- {0} ({1}) {2}", s, elapsedtime, BotPoi.Current.ToString()));
            }
        }

        public static void Display()
        {
            Color c = Color.Yellow;
            List<KeyValuePair<string, int>> list = elapseds.ToList();
            list.Sort(
                delegate(KeyValuePair<string, int> p1, KeyValuePair<string, int> p2)
                {
                    int compareDate = p2.Value.CompareTo(p1.Value);
                    if (compareDate == 0)
                        return p1.Key.CompareTo(p2.Key); ;
                    return compareDate;
                }
            );
            FTWLogger.debug(c, "Timings:");
            int total = 0;
            foreach (KeyValuePair<string, int> kvp in list)
                total += kvp.Value;
            foreach (KeyValuePair<string, int> kvp in list)
                FTWLogger.debug(c, "    {0}: total time {1} ms, ({2:0.0}%), loops {3}, avgtime {4:0} ms", kvp.Key, kvp.Value, kvp.Value * 100 / total, count[kvp.Key], kvp.Value / count[kvp.Key]);
        }
    }
}
