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
    static class FTWCoreUnits
    {
        public static List<WoWPlayer> GetGroup()
        {
            List<WoWPlayer> list;
            try
            {

                string fnname = "FTWCore.GetGroup";
                MyTimer.Start(fnname);
                //ulong[] guids = StyxWoW.Me.GroupInfo.RaidMemberGuids.Union(StyxWoW.Me.GroupInfo.PartyMemberGuids).Union(new[] { StyxWoW.Me.Guid }).Distinct().ToArray();

                //list = (from p in ObjectManager.GetObjectsOfType<WoWPlayer>(true, true)
                //        where p.IsFriendly && guids.Any(g => g == p.Guid)
                //        select p).ToList();

                list = (StyxWoW.Me.GroupInfo.IsInRaid ? StyxWoW.Me.RaidMembers : StyxWoW.Me.PartyMembers);
                if (!list.Contains(StyxWoW.Me))
                    list.Add(StyxWoW.Me);
                list.Sort(
                    delegate(WoWPlayer p1, WoWPlayer p2)
                    {
                        if (p1.DistanceSqr.CompareTo(p2.DistanceSqr) == 0)
                            return p1.Guid.CompareTo(p2.Guid);
                        else
                            return p1.DistanceSqr.CompareTo(p2.DistanceSqr);
                    }
                );

                MyTimer.Stop(fnname);
                return list;
            }
            catch (Exception ex)
            {
                FTWLogger.log(Color.Red, "Error when getting group members: {0}", ex.Message);
                list = new List<WoWPlayer>();
                list.Add(StyxWoW.Me);
                return list;
            }
        }

        public static WoWPlayer GetFocusedPlayer()
        {
            if (StyxWoW.Me.FocusedUnitGuid != 0)
            {
                WoWPlayer player = ObjectManager.GetObjectByGuid<WoWPlayer>(StyxWoW.Me.FocusedUnitGuid);
                if (player != null && FTWProps.people.Contains(player))
                    return player;
            }
            return null;
        }

        public static List<WoWUnit> GetAdds()
        {
            string fnname = "FTWCore.GetAdds";
            MyTimer.Start(fnname);
            WoWUnit pettarget = null;
            WoWUnit mytarget = null;

            // Get pet target
            if (StyxWoW.Me.GotAlivePet &&
               StyxWoW.Me.PetInCombat &&
               StyxWoW.Me.Pet.IsDead == false &&
               StyxWoW.Me.Pet.CurrentTarget.IsValidUnit() &&
               StyxWoW.Me.Pet.CurrentTarget.Combat)
                pettarget = StyxWoW.Me.Pet.CurrentTarget;

            // Get my target
            if (StyxWoW.Me.CurrentTarget != null)
            {
                WoWUnit target = StyxWoW.Me.CurrentTarget;
                if (target.IsValidUnit() &&
                    (target.Combat || target.Name == "Training Dummy") &&
                    target.IsDead == false)
                    mytarget = target;
            }

            // Get all eligible units
            List<WoWUnit> allunits = (
                from u in ObjectManager.GetObjectsOfType<WoWUnit>(false, false)
                where !u.IsFriendly
                where !(FTWProps.mode == "@PULL" && u.TaggedByOther == true)
                where u.Combat
                where !u.IsDead
                where u.DistanceSqr < 50 * 50
                where (!(Battlegrounds.IsInsideBattleground && FTWProps.IgnoreMobsBattleground.Contains(u.Name)))
                where !u.Mounted
                where !u.OnTaxi
                where !u.IsOnTransport
                select u).ToList();

            // Add current targets
            if (pettarget != null && !allunits.Contains(pettarget)) allunits.Add(pettarget);
            if (mytarget != null && !allunits.Contains(mytarget)) allunits.Add(mytarget);

            if (false)
            {
                if (allunits.Count > 0)
                {
                    FTWLogger.debug(Color.Magenta, "{0} adds in all units:", allunits.Count);
                    foreach (WoWUnit wu in allunits)
                    {
                        string s = "    ";
                        s += string.Format("level {0} ", wu.Level);
                        s += string.Format("{0} ", wu.SafeName());
                        s += string.Format("health={0} ({1:0}%) ", wu.CurrentHealth, wu.HealthPercent);
                        s += string.Format("dist={0:0.0} ", wu.Distance);
                        s += string.Format("targetweight={0} ", wu.TargetWeight());
                        s += string.Format("crowdcontrolled={0} ", wu.IsDead || wu.IsCrowdControlled());
                        s += string.Format("isplayer={0} ", wu.IsPlayer);
                        s += string.Format("blacklisted={0} ", Blacklist.Contains(wu));
                        FTWLogger.debug(Color.Magenta, s);
                    }
                }
            }

            bool bg = Battlegrounds.IsInsideBattleground;
            // Get preferrred list (allunits but only those attacking us)
            List<WoWUnit> attackingus = (
                from u in allunits
                where u.IsValidUnit()
                where (bg || (u.Combat &&
                (u.IsTargetingMeOrPet ||
                u.IsTargetingMyPartyMember ||
                u.IsTargetingAnyMinion ||
                u.IsTargetingMyRaidMember ||
                IsTargetingPartyPets(u)
                 )))
                select u).ToList();

            // Add current targets
            if (pettarget != null && !attackingus.Contains(pettarget)) attackingus.Add(pettarget);
            if (mytarget != null && !attackingus.Contains(mytarget)) attackingus.Add(mytarget);

            // Try to use preferred list
            List<WoWUnit> units = attackingus;

            // But if it's empty, kill everyone close by.
            if (false)
            {
                if (StyxWoW.Me.Combat == true && units.Count == 0 && FTWProps.closePeople.Count <= 1)
                {
                    FTWLogger.debug(Color.Yellow, "No adds but I'm in combat, looking at all nearby targets.");
                    units = allunits;
                }
            }
            units = (from u in units
                     orderby
                         u.TargetWeight() descending,
                         u.IsCrowdControlled() ascending,
                         u.IsAttackingHealer() descending,
                         u.Guid == StyxWoW.Me.CurrentTargetGuid descending,
                         u.Guid == FTWProps.tank.CurrentTargetGuid descending,
                         u.DistanceSqr ascending
                     select u).ToList();

            if (false)
            {
                if (units.Count > 0)
                {
                    FTWLogger.debug(Color.Yellow, "{0} adds:", units.Count);
                    foreach (WoWUnit wu in units)
                    {
                        string s = "    ";
                        s += string.Format("level {0} ", wu.Level);
                        s += string.Format("{0} ", wu.SafeName());
                        s += string.Format("health={0} ({1:0}%) ", wu.CurrentHealth, wu.HealthPercent);
                        s += string.Format("dist={0:0.0} ", wu.Distance);
                        s += string.Format("targetweight={0} ", wu.TargetWeight());
                        s += string.Format("crowdcontrolled={0} ", wu.IsDead || wu.IsCrowdControlled());
                        s += string.Format("isplayer={0} ", wu.IsPlayer);
                        s += string.Format("blacklisted={0} ", Blacklist.Contains(wu));
                        FTWLogger.debug(Color.Yellow, s);
                    }
                }
            }
            MyTimer.Stop(fnname);
            return units;

        }

        public static WoWPlayer GetHealer()
        {
            string fnname = "FTWCore.GetHealer";
            MyTimer.Start(fnname);
            WoWPlayer player;
            player = (from p in FTWProps.people
                      where p.Role().Contains("Healer")
                      orderby p.DistanceSqr ascending
                      select p).FirstOrDefault();
            MyTimer.Stop(fnname);
            return player;
        }

        public static WoWPlayer GetHealTarget()
        {
            string fnname = "FTWCore.GetHealTarget";
            MyTimer.Start(fnname);
            WoWPlayer healTarget;
            List<WoWPlayer> healTargets = (from p in FTWProps.closePeople
                                           where p.IsDead == false
                                           where p.IsGhost == false
                                           where p.InLineOfSight
                                           where p.HealthPercent < 90
                                           where p.DistanceSqr < 40 * 40
                                           orderby p.HealWeight()
                                           select p).ToList();
            healTarget = healTargets.FirstOrDefault();
            //if (healTargets.Count > 1)
            //{

            //    debug(Color.GreenYellow, "Heal Weights:");
            //    for (int i = 0; i < healTargets.Count; i++)
            //    {
            //        debug(Color.GreenYellow, "  Heal target {0}: {1} weight {2:0} health {3:0} dist {4:0.0}",
            //            i.ToString(),
            //            healTargets[i].SafeName(),
            //            healTargets[i].HealWeight(),
            //            healTargets[i].HealthPercent,
            //            healTargets[i].DistanceCalc());
            //    }


            //}
            MyTimer.Stop(fnname);
            return healTarget;
        }

        public static List<WoWUnit> GetNearbyUnfriendlyUnits()
        {
            String fnname = "FTWCore.GetNearbyUnfriendlyUnits";
            MyTimer.Start(fnname);
            List<WoWUnit> units;
            units = (from u in ObjectManager.GetObjectsOfType<WoWUnit>(false, false)
                     where u.DistanceSqr < 40 * 40
                     where u.IsValidUnit()
                     //where !Blacklist.Contains(u)
                     where !u.Mounted
                     orderby
                             u.IsCrowdControlled() ascending,
                             u.IsAttackingHealer() descending,
                             u.TargetWeight() descending,
                             u.Guid == StyxWoW.Me.CurrentTargetGuid descending,
                             u.Guid == FTWProps.tank.CurrentTargetGuid descending,
                             u.DistanceSqr ascending
                     select u).ToList();
            MyTimer.Stop(fnname);
            return units;
        }

        public static WoWPlayer GetTank()
        {
            string fnname = "FTWCore.GetTank";
            WoWPlayer tank = null;

            MyTimer.Start(fnname);

            // Return RaFHelper if specified
            if (RaFHelper.Leader != null)
            {
                tank = RaFHelper.Leader;
            }
            else
            {
                // Return focused unit if it's a player in my party
                tank = GetFocusedPlayer();
                if (tank == null)
                    // Look for the actual tank.
                    tank = (from p in FTWProps.people
                            where p.Role().Contains("Tank")
                            orderby p.DistanceSqr ascending
                            select p).FirstOrDefault();

                // Look for the leader
                if (tank == null)
                    tank = (from p in FTWProps.people
                            where p.Role().Contains("Leader")
                            orderby p.DistanceSqr ascending
                            select p).FirstOrDefault();

                if (tank == null)
                    tank = StyxWoW.Me;

            }
            MyTimer.Stop(fnname);
            return tank;
        }

        public static bool IsTargetingPartyPets(WoWUnit unit)
        {

            if (unit == null || !unit.Combat || unit.CurrentTarget == null)
                return false;
            WoWUnit target = unit.CurrentTarget;
            if (target.OwnedByUnit != null && FTWProps.people.Contains(target.OwnedByUnit) && !unit.IsFriendly)
            {
                return true;
            }
            return false;
        }

        public static int GetPartyWithAura(string auraname)
        {
            string fnname = "FTWCore.GetPartyWithAura";
            MyTimer.Start(fnname);
            int count = 0;
            foreach (WoWPlayer p in FTWProps.people)
            {
                if (p.HasAura(auraname))
                    count += 1;
            }
            MyTimer.Stop(fnname);
            return count;
        }

        public static int GetPartyWithHealth(string strHealth)
        {
            int health = Int32.Parse(strHealth);
            return (from p in FTWProps.closePeople
                    where p.IsDead == false
                        && p.HealthPercent <= health
                    select p).Count();
        }
    }
}
