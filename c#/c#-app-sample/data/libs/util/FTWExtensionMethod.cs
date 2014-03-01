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
using FTWRev.data.libs.core;


namespace FTWRev.data.libs.util
{
    public static class FTWExtensionMethods
    {
        private static int _petstate = 0;
        private static DateTime _pettimer = DateTime.Now;
        private static Dictionary<string, int> killweights = new Dictionary<string, int> {
            // Healers
            {"Druid_talentless", 4}, 
            {"Priest_talentless", 4}, 
            {"Paladin_talentless", 4},
            {"Monk_talentless", 4},
            {"Shaman_talentless", 4},
            // Casters
            {"Mage_talentless", 3},
            {"Warlock_talentless", 3},
            {"Hunter_talentless", 2},
            // Melee
            {"Rogue_talentless", 2},
            {"DeathKnight_talentless", 2},
            {"Warrior_Talentless", 2}};

        public static bool ClearBehindMe(this WoWPlayer p, string strRange)
        {
            float range = float.Parse(strRange);
            WoWPoint pt = WoWMathHelper.CalculatePointBehind(p.Location, p.Rotation, -range);
            if (!Navigator.CanNavigateFully(StyxWoW.Me.Location, pt))
                return false;
            List<WoWUnit> list = (from u in ObjectManager.GetObjectsOfType<WoWUnit>(false, false)
                                  where u.Location.DistanceSqr(pt) < range * range
                                  where u.IsDead == false
                                  where u.IsHostile == true
                                  select u).ToList();
            if (list.Count > 0)
                return false;
            return true;
        }

        public static int UnitPower(this WoWPlayer p, int powertype)
        {
            string fnname = "FTWExtensionMethods.UnitPower";
            MyTimer.Start(fnname);
            int cnt = 0;
            try
            {
                cnt = Convert.ToInt32(Lua.GetReturnValues(string.Format("return UnitPower('player', {0})", powertype), "PowerType.lua")[0]);
            }
            catch (Exception ex)
            {
                FTWLogger.log(Color.Red, "Error when getting UnitPower - {0}", ex.Message);
                cnt = 0;
            }
            MyTimer.Stop(fnname);
            return cnt;
        }

        public static bool HasSpell(this WoWPlayer p, String spellname)
        {
            string fnname = "FTWExtensionMethods.HasSpell";
            MyTimer.Start(fnname);
            WoWSpell spell = null;
            try
            {
                spell = SpellManager.Spells[spellname];
            }
            catch (KeyNotFoundException ex)
            {
            }
            MyTimer.Stop(fnname);
            if (spell == null)
                return false;
            else
                return true;
        }

        public static string Role(this WoWPlayer p)
        {
            string fnname = "FTWExtensionMethods.Role";
            MyTimer.Start(fnname);
            IEnumerable<WoWPartyMember> wpms = StyxWoW.Me.GroupInfo.RaidMembers.Union(StyxWoW.Me.GroupInfo.PartyMembers).Distinct();
            WoWPartyMember wpm = (from member in wpms
                                  let x = member.ToPlayer()
                                  where x != null && p.Guid == x.Guid
                                  select member).FirstOrDefault();
            MyTimer.Stop(fnname);
            if (wpm == null)
                return "";
            else
                return wpm.Role.ToString();
        }

        public static bool IsDPS(this WoWPlayer p)
        {
            if (!StyxWoW.Me.GroupInfo.IsInParty && !StyxWoW.Me.GroupInfo.IsInRaid)
                return true;
            return p.Role().Contains("Damage");
        }

        public static bool IsTank(this WoWPlayer p)
        {
            if (!StyxWoW.Me.GroupInfo.IsInParty && !StyxWoW.Me.GroupInfo.IsInRaid)
                return true;
            return p.Role().Contains("Tank");
        }

        public static bool IsHealer(this WoWPlayer p)
        {
            if (!StyxWoW.Me.GroupInfo.IsInParty && !StyxWoW.Me.GroupInfo.IsInRaid)
                return false;
            return p.Role().Contains("Healer");
        }

        public static bool HasItem(this WoWPlayer p, string itemname)
        {
            bool retval;
            string fnname = "FTWExtensionMethods.HasItem";
            MyTimer.Start(fnname);
            using (StyxWoW.Memory.AcquireFrame())
            {
                WoWItem item = StyxWoW.Me.CarriedItems.FirstOrDefault(i => i != null && i.Name == itemname);
                if (item == null)
                {
                    retval = false;
                }
                else
                {
                    int cnt = Convert.ToInt32(Lua.GetReturnValues(String.Format("return GetItemCount(\"{0}\")", item.Name), "HasItem.lua")[0]);
                    if (cnt == 0)
                        retval = false;
                    else
                        retval = true;
                }
            }
            MyTimer.Stop(fnname);
            return retval;
        }

        public static bool EatingOrDrinking(this WoWPlayer p)
        {
            if (p.Combat) return false;
            if (p.HasAura("Drink") && p.ManaPercent < 95) return true;
            if (p.HasAura("Food") && p.HealthPercent < 95) return true;
            return false;
        }

        public static bool EligibleForCleanse(this WoWPlayer p)
        {
            string fnname = "FTWExtensionMethods.EligibleForCleanse";
            MyTimer.Start(fnname);
            bool retval = !p.IsDead && !p.IsGhost && p.InLineOfSight && p.HealthPercent < 90 && p.IsDiseased();
            MyTimer.Stop(fnname);
            return retval;
        }

        public static bool EligibleForRevive(this WoWPlayer p)
        {
            string fnname = "FTWExtensionMethods.EligibleForRevive";
            MyTimer.Start(fnname);
            bool retval = p.IsDead || p.IsGhost;
            MyTimer.Stop(fnname);
            return retval;
        }

        public static string ClassAndSpec(this WoWPlayer p)
        {
            string fnname = "FTWExtensionMethods.ClassAndSpec";
            MyTimer.Start(fnname);
            string s = "";
            using (StyxWoW.Memory.AcquireFrame())
            {
                string _myclass = p.Class.ToString();
                string _myspec = "talentless";
                // Get class
                int talentTabId = Lua.GetReturnVal<int>("return GetSpecialization()", 0); // Returns 1 to 3 for primary talent tab id, or 0 if no talent tree chosen yet.
                if (talentTabId != 0)
                {
                    // Get spec
                    var GetTalentTabInfo = Lua.GetReturnValues(string.Format("return GetSpecializationInfo({0},false,false)", talentTabId));
                    _myspec = GetTalentTabInfo[1].Replace(" ", "_");
                }
                s = string.Format("{0}_{1}", _myclass, _myspec);
            }
            MyTimer.Stop(fnname);
            return s;
        }

        public static int HealWeight(this WoWPlayer p)
        {
            string s = p.Role();
            int adj = 0;
            if (s == "Tank")
                adj = 5;
            else if (s == "Healer")
                adj = 10;
            return (int)p.HealthPercent - adj;
        }

        public static int PetIsMissing(this WoWPlayer p)
        {
            if ((p.GotAlivePet || p.Mounted) && p.Pet != null)
            {
                _petstate = 0;
                return 0;
            }
            if (_petstate == 0)
            {
                _pettimer = DateTime.Now.AddSeconds(3);
                _petstate = 1;
                return 0;
            }
            else if (_petstate == 1)
            {
                if (DateTime.Now < _pettimer)
                    return 0;
                _petstate = 2;
                return 0;
            }
            else if (_petstate == 2)
            {
                _petstate = 3;
                return 0;
            }
            else
            {
                // petstate == 3 - let revive pet kick in
                return 1;
            }
        }

        public static int ClusterSize(this WoWUnit unit)
        {
            string fnname = "FTWExtensionMethods.ClusterSize";
            MyTimer.Start(fnname);
            List<WoWUnit> units = (from u in ObjectManager.GetObjectsOfType<WoWUnit>(false, false)
                                   where u.Guid != unit.Guid
                                   where u.Location.Distance(unit.Location) < 6
                                   where u.CanSelect || u.Attackable
                                   where !u.IsFriendly
                                   where !u.IsDead
                                   where !u.IsPet
                                   where !u.IsNonCombatPet
                                   where !u.IsCritter
                                   where !u.Mounted
                                   select u).ToList();
            MyTimer.Stop(fnname);
            return (units.Count);
        }

        public static string ShortGuid(this WoWUnit unit)
        {
            return unit.Guid.ToString().Substring(unit.Guid.ToString().Length - 4, 4);
        }

        public static int AuraExpiring(this WoWUnit unit, string auraname)
        {
            string fnname = "FTWExtensionMethods.AuraExpiring";
            MyTimer.Start(fnname);

            // Return my aura if it exists, first.
            foreach (WoWAura aura in unit.Auras.Values)
            {
                if (aura.Name == auraname && aura.CreatorGuid == StyxWoW.Me.Guid)
                {
                    MyTimer.Stop(fnname);
                    return (int)aura.TimeLeft.TotalMilliseconds;
                }
            }

            // Otherwise any aura of this name
            foreach (WoWAura aura in unit.Auras.Values)
            {
                if (aura.Name == auraname)
                {
                    MyTimer.Stop(fnname);
                    return (int)aura.TimeLeft.TotalMilliseconds;
                }
            }

            // No aura found
            MyTimer.Stop(fnname);
            return 0;
        }

        public static int MyAuraExpiring(this WoWUnit unit, string auraname)
        {
            string fnname = "FTWExtensionMethods.MyAuraExpiring";
            MyTimer.Start(fnname);
            foreach (WoWAura aura in unit.Auras.Values)
            {
                if (aura.Name == auraname && aura.CreatorGuid == StyxWoW.Me.Guid)
                {
                    MyTimer.Stop(fnname);
                    return (int)aura.TimeLeft.TotalMilliseconds;
                }
            }
            MyTimer.Stop(fnname);
            return 0;
        }

        public static void printAuras(this WoWUnit unit)
        {
            foreach (WoWAura aura in unit.Auras.Values)
            {
                FTWLogger.debug(aura.Name + ' ' + aura.CreatorGuid);
            }
        }

        public static bool HasMyAura(this WoWUnit unit, string auraname)
        {
            string fnname = "FTWExtensionMethods.HasMyAura";
            MyTimer.Start(fnname);
            foreach (WoWAura aura in unit.Auras.Values)
            {
                if (aura.Name == auraname && aura.CreatorGuid == StyxWoW.Me.Guid)
                {
                    MyTimer.Stop(fnname);
                    return true;
                }
            }
            MyTimer.Stop(fnname);
            return false;
        }

        public static int StackCount(this WoWUnit unit, string auraname)
        {
            // Return my aura if it exists, first.
            string fnname = "FTWExtensionMethods.StackCount";
            MyTimer.Start(fnname);
            foreach (WoWAura aura in unit.Auras.Values)
            {
                if (aura.Name == auraname && aura.CreatorGuid == StyxWoW.Me.Guid)
                {
                    MyTimer.Stop(fnname);
                    return (int)aura.StackCount;
                }
            }

            // Otherwise any aura of this name
            foreach (WoWAura aura in unit.Auras.Values)
            {
                if (aura.Name == auraname)
                {
                    MyTimer.Stop(fnname);
                    return (int)aura.StackCount;
                }
            }

            // No aura found
            MyTimer.Stop(fnname);
            return 0;
        }

        public static int MyStackCount(this WoWUnit unit, string auraname)
        {
            string fnname = "FTWExtensionMethods.MyStackCount";
            MyTimer.Start(fnname);
            foreach (WoWAura aura in unit.Auras.Values)
            {
                if (aura.Name == auraname && aura.CreatorGuid == StyxWoW.Me.Guid)
                {
                    MyTimer.Stop(fnname);
                    return (int)aura.StackCount;
                }
            }
            MyTimer.Stop(fnname);
            return 0;
        }

        public static string SafeName(this WoWUnit unit)
        {
            if (unit.IsPlayer)
            {
                WoWPlayer player = (WoWPlayer)unit;
                if (player == StyxWoW.Me)
                    return "Me";
                string prefix = "";
                if (player.IsInMyPartyOrRaid)
                    prefix = "Party";
                return string.Format("{0}{1}_{2}", prefix, player.Class.ToString(), player.ShortGuid());
            }
            else
                return unit.Name;
        }

        public static int TargetWeight(this WoWUnit unit)
        {
            if (unit.IsPlayer)
            {
                WoWPlayer player = (WoWPlayer)unit;
                string cs = player.ClassAndSpec();
                if (killweights.ContainsKey(cs))
                    return killweights[cs];
                else
                    return 1;
            }
            if (!FTWProps.MobWeights.ContainsKey(unit.Name))
                return 0;
            else
                return FTWProps.MobWeights[unit.Name];
        }

        public static bool IsCrowdControlled(this WoWUnit unit)
        {
            string fnname = "FTWExtensionMethods.IsCrowdControlled";
            bool retval = false;
            MyTimer.Start(fnname);
            if (unit == null)
            {
                MyTimer.Stop(fnname);
                return false;
            }
            foreach (WoWAura aura in unit.Debuffs.Values)
            {
                try
                {
                    if (FTWProps.Stuns.Contains(aura.Name))
                        retval = true;
                    else if (aura.Spell == null)
                        continue;
                    else if ((
                         aura.Spell.Mechanic == WoWSpellMechanic.Asleep ||
                         aura.Spell.Mechanic == WoWSpellMechanic.Banished ||
                         aura.Spell.Mechanic == WoWSpellMechanic.Frozen ||
                         aura.Spell.Mechanic == WoWSpellMechanic.Horrified ||
                         aura.Spell.Mechanic == WoWSpellMechanic.Invulnerable2 ||
                         aura.Spell.Mechanic == WoWSpellMechanic.Incapacitated ||
                         aura.Spell.Mechanic == WoWSpellMechanic.Polymorphed ||
                         aura.Spell.Mechanic == WoWSpellMechanic.Rooted ||
                         aura.Spell.Mechanic == WoWSpellMechanic.Sapped ||
                         aura.Spell.Mechanic == WoWSpellMechanic.Shackled ||
                         aura.Spell.Mechanic == WoWSpellMechanic.Stunned ||
                         aura.Spell.Mechanic == WoWSpellMechanic.Turned ||
                         aura.Spell.Mechanic == WoWSpellMechanic.Fleeing)
                        && aura.TimeLeft.TotalMilliseconds > 0)
                        retval = true;
                }
                catch (Exception ex)
                {
                    FTWLogger.log(Color.Red, "Error when examining aura {0} : {1}", aura.Name, ex.Message);
                    retval = false;
                }
                if (retval == true)
                    break;
            }
            if (retval)
                FTWLogger.log(Color.GreenYellow, "{0} IS INCAPACITATED", unit.SafeName());
            MyTimer.Stop(fnname);
            return retval;
        }

        public static string CurrentSpellName(this WoWUnit unit)
        {
            if (unit == null ||
                unit.CurrentCastId <= 0 ||
                (!unit.IsCasting && !unit.IsChanneling))
                return string.Empty;
            WoWSpell spell = WoWSpell.FromId((int)unit.CurrentCastId);
            if (spell == null)
                return string.Empty;
            return spell.Name;
        }

        public static bool IsValidUnit(this WoWUnit unit)
        {
            string fnname = "FTWExtensionMethods.IsValidUnit";
            if (unit == null) return false;
            MyTimer.Start(fnname);
            bool retval = true;
            string ispet = unit.IsPet.ToString();
            string owner = "<none>";
            string reason = "";

            if (Blacklist.Contains(unit.Guid))
            {
                if (unit.Combat && (
                    unit.IsTargetingMeOrPet ||
                    unit.IsTargetingMyPartyMember ||
                    unit.IsTargetingAnyMinion ||
                    unit.IsTargetingMyRaidMember ||
                    FTWCoreUnits.IsTargetingPartyPets(unit)
                    ))
                {
                    // ignore  blacklist
                    // HB will keep feeding you that target anyway.
                }
                else
                {
                    reason = "{0} is blacklisted";
                }
            }
            else if (!unit.CanSelect || !unit.Attackable) reason = "can't select or attack {0}";
            else if (unit.IsFriendly) reason = "{0} is friendly";
            else if (unit.IsDead) reason = "{0} is dead";
            // The following line causes you to ignore mobs your party is fighting.
            //else if (unit.TaggedByOther) reason = "{0} is tagged by other.";
            else if (unit.HealthPercent == 0) reason = "{0}'s health is 0";
            else if ((unit.IsPet && ((unit.OwnedByUnit != null && unit.OwnedByUnit.IsPlayer == true) || unit.OwnedByRoot == null || unit.OwnedByRoot.IsDead == false))) reason = "{0} is pet";
            else if (unit.IsNonCombatPet) reason = "{0} is noncombat pet";
            else if (unit.IsCritter) reason = "{0} is critter";
            else if (Battlegrounds.IsInsideBattleground && FTWProps.IgnoreMobsBattleground.Contains(unit.Name)) reason = "{0} is in ignored battleground mobs";
            MyTimer.Stop(fnname);
            if (reason == "")
            {
                retval = true;
                if (false && unit.IsPet)
                {
                    if (unit.OwnedByRoot != null)
                    {
                        string prefix = "npc";
                        if (unit.OwnedByRoot.IsPlayer)
                            prefix = "player";
                        owner = string.Format("pet {0} owned by {1} {2}", unit.Name, prefix, unit.OwnedByRoot.Name);
                    }
                    else
                    {
                        owner = string.Format("pet {0} owned by no one", unit.Name);
                    }
                    FTWLogger.debug(Color.MediumVioletRed, owner);
                }
            }
            else
            {
                FTWLogger.debug(Color.MediumVioletRed, reason, unit.Name);
                retval = false;
            }
            return retval;
        }

        public static bool HasAuraWithMechanic(this WoWUnit unit, params WoWSpellMechanic[] mechanics)
        {
            string fnname = "FTWExtensionMethods.HasAuraWithMechanic";
            MyTimer.Start(fnname);
            foreach (KeyValuePair<string, WoWAura> kvp in unit.Auras)
            {
                foreach (WoWSpellMechanic mech in mechanics)
                {
                    if (kvp.Value.Spell.Mechanic == mech)
                    {
                        MyTimer.Stop(fnname);
                        return true;
                    }
                }
            }
            MyTimer.Stop(fnname);
            return false;
        }

        public static bool IsAttackingHealer(this WoWUnit unit)
        {
            string fnname = "FTWExtensionMethods.IsAttackingHealer";
            MyTimer.Start(fnname);
            bool retval = false;
            if (!(unit.IsAlive && unit.IsHostile && unit.CurrentTarget != null)) retval = false;
            else if (!unit.CurrentTarget.IsPlayer) retval = false;
            else if (!unit.IsTargetingMyPartyMember) retval = false;
            else if (!unit.IsTargetingMyRaidMember) retval = false;
            else
            {
                WoWPlayer target = (WoWPlayer)unit.CurrentTarget;
                if (target.Role().Contains("Healer"))
                    retval = true;
            }
            MyTimer.Stop(fnname);
            return retval;
        }

        public static double DistanceCalc(this WoWUnit unit)
        {
            if (unit == null)
                return 0;
            return unit.Distance;
            //return unit.Location.Distance(StyxWoW.Me.Location);
        }

        public static bool IsDiseased(this WoWUnit unit)
        {
            string fnname = "FTWExtensionMethods.IsDiseased";
            MyTimer.Start(fnname);
            if (unit == null)
            {
                MyTimer.Stop(fnname);
                return false;
            }
            WoWAura aura = (from debuff in unit.Debuffs.Values
                            where debuff.Spell != null && FTWProps.dispels.Contains(debuff.Spell.DispelType)
                            select debuff).FirstOrDefault();
            MyTimer.Stop(fnname);
            return aura != null;
        }

        public static bool IsAreaSpell(this WoWSpell spell)
        {
            if (FTWProps.AOESpells.Contains(spell.Name))
                return true;
            else
                return false;
        }
        public static bool IsTankOnlySpell(this WoWSpell spell)
        {
            if (FTWProps.TankOnlySpells.Contains(spell.Name))
                return true;
            else
                return false;
        }

        //public static bool OnCooldown(this WoWSpell spell)
        //{
        //    var retval = Lua.GetReturnValues(String.Format("return GetSpellCooldown({0})", spell.Id), "SpellCooldown.lua");

        //    if (retval == null || retval.Count < 2)
        //    {
        //        FTWLogger.log(Color.Red, "Error when getting cooldown of {0}!", spell.Name);
        //        return false;
        //    }

        //    float cooldown = float.Parse(retval[1]);
        //    FTWLogger.log("Cooldown remaining for {0}: {1} {2} {3}", spell.Name, retval[0], retval[1], retval[2]);
        //    if (cooldown > 0)
        //        return true;
        //    return false;
        //}
    }
}
