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
    public static class CheckForChest
    {
        private static DateTime nexttime = DateTime.Now;
        private static DateTime stoptime = DateTime.Now;
        private static int pullSeconds = 60;
        private static int blacklistMinutes = 60;
        private static int checkInterval = 5;
        private static ulong lastguid = 0;
        private static Color color = Color.SlateBlue;

        public static void Clear()
        {
            if (BotPoi.Current.Type == PoiType.Loot)
            {
                BotPoi.Clear();
                lastguid = 0;
            }
        }
        public static void Pulse()
        {
            string fnname = "CheckForChest.Pulse";
            MyTimer.Start(fnname);
            if (BotPoi.Current.Type == PoiType.Loot)
            {
                // Black list loot if it's taking too long
                FTWLogger.log(color, "LOOT CHESTS: Moving towards {0} ({1:X}) at {2} yards away", BotPoi.Current.Name, BotPoi.Current.Guid, BotPoi.Current.Location.Distance(StyxWoW.Me.Location));
                if (BotPoi.Current.Guid == lastguid && DateTime.Now > stoptime)
                {
                    FTWLogger.log(color, "LOOT CHESTS: Blacklisting {0} ({1:X}) - didn't get it after {2} seconds.", BotPoi.Current.Name, BotPoi.Current.Guid, blacklistMinutes);
                    Blacklist.Add(lastguid, BlacklistFlags.All, TimeSpan.FromMinutes(60));
                    Clear();
                }
            }
            else
            {
                // Look for new loot
                if (DateTime.Now < nexttime)
                {
                    MyTimer.Stop(fnname);
                    return;
                }
                // OMG DON'T run for a chest in a dungeon!
                // 'Tap tool' on beer keg in Stormstout causes you to pull multiple rooms of mobs.
                if (StyxWoW.Me.IsInInstance)
                    return;
                nexttime = DateTime.Now.AddSeconds(checkInterval);
                List<WoWGameObject> chests = (from c in ObjectManager.GetObjectsOfType<WoWGameObject>(false, false)
                                              where c.Distance < Styx.CommonBot.LootTargeting.LootRadius
                                              where c.Type != WoWObjectType.Corpse &&
                                                c.SubType == WoWGameObjectType.Chest &&
                                                !Blacklist.Contains(c.Guid, BlacklistFlags.All) &&
                                                c.CanLoot == true
                                              where c.IsHerb == false && c.IsMineral == false
                                              orderby c.Distance
                                              select c).ToList();
                if (chests.Count > 0)
                {
                    lastguid = chests[0].Guid;
                    BotPoi.Current = new BotPoi(chests[0], PoiType.Loot);
                    FTWLogger.log(color, "LOOT CHESTS: Going after {0} ({1:X}) at {2} yards away", chests[0].Name, chests[0].Guid, chests[0].Distance);
                    stoptime = DateTime.Now.AddSeconds(pullSeconds);
                }
            }
            MyTimer.Stop(fnname);
        }
    }
}
