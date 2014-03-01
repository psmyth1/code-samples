using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

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

using FTWRev.data.libs;
using FTWRev.data.libs.util;

namespace FTWRev.data.libs.core
{
    static class FTWCoreMovement
    {
        public static bool FollowTarget()
        {
            string fnname = "FTWCore.FollowTarget";
            MyTimer.Start(fnname);
            LocalPlayer Me = StyxWoW.Me;
            WoWUnit followtarget = null;
            double maxDist = FTWProps.range;
            bool retval = false;
            bool followtank = false;
            if (Styx.CommonBot.BotManager.Current.Name == "Grind Bot" &&
                FTWProps.tank.IsDead == false &&
                FTWProps.tank.Guid != StyxWoW.Me.Guid)
                followtank = true;
            else
                followtank = false;

            // Leave early if they don't want movement and facing.
            if (FTWUtils.MovementDisabled())
            {
                FTWLogger.log(Color.Violet, "Movement disabled, not following");
            }
            else if (DateTime.Now < FTWProps.MovementCooldown || StyxWoW.Me.IsCasting || StyxWoW.Me.IsChanneling)
            {
                //log(Color.Violet, "Casting, not following");
            }
            else if (BotPoi.Current.Type == PoiType.Loot)
            {
                FTWLogger.log(Color.Violet, "Looting, not following");
            }
            else if (FTWProps.mode == "@PULL")
            {
                // Just follow whoever is targeted
                followtarget = StyxWoW.Me.CurrentTarget;
            }
            else if (FTWProps.mode == "@COMBAT")
            {
                // In combat, follow target preferentially
                followtarget = StyxWoW.Me.CurrentTarget;
                if (StyxWoW.Me.IsHealer() ||
                    (followtarget == null ||
                    !followtarget.IsValidUnit()
                ) && followtank)
                {
                    followtarget = FTWProps.tank;
                    maxDist = 10;
                }
            }
            else if (FTWProps.mode == "@REST")
            {
                // Out of combat, follow tank preferentially
                if (followtank)
                {
                    followtarget = FTWProps.tank;
                    maxDist = 15;
                }
            }
            else
            {
                FTWLogger.log(Color.Red, "UNKNOWN MODE {0}", FTWProps.mode);
            }

            if (followtarget == null)
            {
                //log(Color.Violet, "No target in FollowTarget");
            }
            else if (followtarget.IsDead)
            {
                //log(Color.Violet, "Target is dead in FollowTarget");
            }
            else if (followtarget.DistanceCalc() <= maxDist && followtarget.InLineOfSpellSight)
            {
                // If close enough, leave
                WoWMovement.MoveStop();
                if (followtarget.IsValidUnit() && !StyxWoW.Me.IsSafelyFacing(followtarget))
                    Face(followtarget);
            }
            else
            {
                // Keep following
                FTWLogger.log("Keep following {0} (dist {1:0.00}, InLineOfSight = {2}, InLineOfSpellSight = {3})", followtarget.SafeName(), followtarget.DistanceCalc(), followtarget.InLineOfSight, followtarget.InLineOfSpellSight);
                WoWPoint loc = followtarget.Location;

                // Get to right under the mob, if it's flying
                if (!Navigator.CanNavigateFully(StyxWoW.Me.Location, followtarget.Location))
                {
                    //List<float> heights = Navigator.FindHeights(loc.X, loc.Y);
                    //if (heights.Count > 0)
                    //    loc.Z = heights.Max();
                    Styx.WoWInternals.WoWMovement.ClickToMove(loc);
                }
                else
                {
                    // Move to the mob's location
                    Navigator.MoveTo(loc);
                }
                retval = true;
            }

            MyTimer.Stop(fnname);
            return retval;
        }

        public static void Face(WoWUnit mob)
        {
            DateTime stoptime = DateTime.Now.AddSeconds(1);
            if (StyxWoW.Me.Location == mob.Location)
            {
                KeyboardManager.PressKey((char)Keys.Back);
                Thread.Sleep(50);
                KeyboardManager.ReleaseKey((char)Keys.Back);
                return;
            }
            while (!StyxWoW.Me.IsSafelyFacing(mob) && DateTime.Now < stoptime)
            {
                FTWLogger.debug(Color.Violet, "Facing {0}", mob.SafeName());
                mob.Face();
                Thread.Sleep(10);
            }
        }
    }
}
