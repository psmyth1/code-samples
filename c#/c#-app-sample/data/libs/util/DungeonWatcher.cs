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
    public static class DungeonWatcher
    {
        public static bool AutoAcceptDungeon = false;
        public static bool AutoQueueDungeon = false;
        private static DateTime dungeondoneat = DateTime.MinValue;

        public static void Initialize()
        {
            // Watch for dungeon invites
            Lua.Events.AttachEvent("LFG_PROPOSAL_SHOW", HandleDungeonInvite);
            Lua.Events.AttachEvent("LFG_COMPLETION_REWARD", HandleDungeonDone);
            Lua.Events.AttachEvent("RESURRECT_REQUEST", HandleResurrect);
        }

        public static void HandleDungeonInvite(object sender, LuaEventArgs args)
        {
            if (AutoAcceptDungeon)
            {
                FTWLogger.log(Color.SandyBrown, "Accepting dungeon invite");
                Lua.DoString("AcceptProposal()");
            }
        }

        public static void HandleDungeonDone(object sender, LuaEventArgs args)
        {
            // Done with dungeon
            if (AutoQueueDungeon)
            {
                Thread.Sleep(60000);
                Lua.DoString("LeaveParty()");
            }
        }

        public static void HandleResurrect(object sender, LuaEventArgs args)
        {
            float waitseconds = Lua.GetReturnVal<float>("return GetCorpseRecoveryDelay()", 0);
            Thread.Sleep((int)(waitseconds * 1000));
            Lua.DoString("AcceptResurrect()");
        }

        public static void Pulse()
        {
            string s = Lua.GetReturnVal<string>("local m,s = GetLFGMode(LE_LFG_CATEGORY_LFD); return m;", 0);
            if (s == null)
                s = "<null>";
            //debug(Color.SandyBrown, "LFGMode: {0}", s);
            if (StyxWoW.Me.Level < 15 ||
                AutoQueueDungeon == false ||
                StyxWoW.Me.IsInInstance == true ||
                IsLFGDeserter() == true ||
                InLFDQueue() == true)
                return;

            FTWLogger.log(Color.SandyBrown, "Queuing for dungeon");
            Lua.DoString("LFDQueueFrame_Join()");

        }

        private static bool InLFDQueue()
        {
            string s = GetLFDMode();
            FTWLogger.log(Color.SandyBrown, "LFDMode: {0}", s);
            return s == "queued" || s == "proposal";
        }

        private static string GetLFDMode()
        {
            string s = Lua.GetReturnVal<string>("local m,s = GetLFGMode(LE_LFG_CATEGORY_LFD); return m;", 0);
            return s == null ? "none" : s;
        }

        private static bool IsLFGDeserter()
        {
            return Lua.GetReturnVal<bool>("return UnitHasLFGDeserter('player')", 0);
        }

    }
}
