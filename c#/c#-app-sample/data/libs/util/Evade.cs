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
    public static class Evade
    {
        private static ulong PullTargetGuid = 0;
        private static DateTime PullStopTime = DateTime.Now;
        private static int MaxPullTime = 20;
        private static ulong CurrentTargetGuid = 0;
        private static DateTime CurrentTargetStopTime = DateTime.Now;
        private static int MaxCurrentTargetTime = 20;

        public static bool CheckCombat()
        {
            // Check for combat taking too long
            string fnname = "Evade.CheckCombat";
            MyTimer.Start(fnname);
            WoWUnit target = StyxWoW.Me.CurrentTarget;
            if (target == null || target.IsFriendly)
            {
                MyTimer.Stop(fnname);
                return true;
            }
            if (target.IsDead == true && !target.IsFriendly)
            {
                StyxWoW.Me.ClearTarget();
                return true;
            }

            if (target.Guid != CurrentTargetGuid)
            {
                // New target
                CurrentTargetStopTime = DateTime.Now.AddSeconds(MaxCurrentTargetTime);
                CurrentTargetGuid = target.Guid;
                FTWLogger.log("Starting combat with {0} {1}", target.SafeName(), target.ShortGuid());
                if (!FTWUtils.MovementDisabled())
                    WoWMovement.MoveStop();
            }
            else if (DateTime.Now > CurrentTargetStopTime && target.HealthPercent > 99 && !target.Name.Contains("Training Dummy") && !StyxWoW.Me.GroupInfo.IsInParty && !StyxWoW.Me.GroupInfo.IsInRaid)
            {
                // I've been fighting the same target by myself for too long - blacklist
                FTWLogger.log("Combat with {0} has gone on {1} seconds with no health reduction - adding to blacklist", target.SafeName(), MaxCurrentTargetTime);
                Blacklist.Add(target.Guid, TimeSpan.FromMinutes(5));
                StyxWoW.Me.ClearTarget();
                MyTimer.Stop(fnname);
                return false;
            }
            MyTimer.Stop(fnname);
            return true;
        }

        public static bool CheckPull()
        {
            string fnname = "Evade.CheckPull";
            MyTimer.Start(fnname);
            // Check for botpoi not being something else
            if (!(BotPoi.Current.Type == PoiType.Kill || BotPoi.Current.Type == PoiType.None))
                return false;

            // Check for pull taking too long
            WoWUnit target = StyxWoW.Me.CurrentTarget;
            if (target == null || target.IsFriendly)
            {
                MyTimer.Stop(fnname);
                return false;
            }

            if (StyxWoW.Me.HealthPercent < 50 || StyxWoW.Me.ManaPercent < 50)
            {
                FTWLogger.log(Color.Red, "Health or mana is below 50%, not pulling!");
                StyxWoW.Me.ClearTarget();
                MyTimer.Stop(fnname);
                return false;
            }

            //if (!target.IsValidUnit())
            //{
            //    log("Blacklisting {0} for 60 seconds in CheckPull", target.SafeName());
            //    Blacklist.Add(target, TimeSpan.FromSeconds(60));
            //    StyxWoW.Me.ClearTarget();
            //    MyTimer.Stop(fnname);
            //    return false;
            //}

            int clustersize = target.ClusterSize();
            FTWLogger.log(Color.Violet, "PULL: Target = {0} at {1} ({2}) ({3} mobs surrounding)", target.SafeName(), target.DistanceCalc(), target.FactionId, clustersize);

            if (target.Guid != PullTargetGuid)
            {
                // New pull target - reset timer for maxPullTime seconds
                PullStopTime = DateTime.Now.AddSeconds(MaxPullTime);
                PullTargetGuid = target.Guid;
            }
            else if (DateTime.Now > PullStopTime)
            {
                // Still pulling after maxPullTime seconds
                FTWLogger.log(Color.Red, "Can't pull {0} after {1} seconds - blacklist for 5 minutes.", target.SafeName(), MaxPullTime);
                Blacklist.Add(target.Guid, TimeSpan.FromMinutes(5));
                StyxWoW.Me.ClearTarget();
                MyTimer.Stop(fnname);
                return false;
            }
            MyTimer.Stop(fnname);
            return true;
        }
    }
}
