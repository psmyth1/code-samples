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
    public class FTWCore
    {
        public FTWCore()
        {
            string fnname = "FTWCore.Constructor";
            MyTimer.Start(fnname);
            if (SpellManager.HasSpell("Detox"))
            {
                // Monk
                if (!FTWProps.dispels.Contains(WoWDispelType.Disease)) FTWProps.dispels.Add(WoWDispelType.Disease);
                if (!FTWProps.dispels.Contains(WoWDispelType.Poison)) FTWProps.dispels.Add(WoWDispelType.Poison);
            }
            if (SpellManager.HasSpell("Remove Corruption"))
            {
                // Druid
                if (!FTWProps.dispels.Contains(WoWDispelType.Curse)) FTWProps.dispels.Add(WoWDispelType.Curse);
                if (!FTWProps.dispels.Contains(WoWDispelType.Poison)) FTWProps.dispels.Add(WoWDispelType.Poison);
            }
            if (SpellManager.HasSpell("Remove Curse"))
            {
                // Mage
                if (!FTWProps.dispels.Contains(WoWDispelType.Curse)) FTWProps.dispels.Add(WoWDispelType.Curse);
            }
            if (SpellManager.HasSpell("Purify Spirit"))
            {
                // Shaman
                if (!FTWProps.dispels.Contains(WoWDispelType.Curse)) FTWProps.dispels.Add(WoWDispelType.Curse);
                if (!FTWProps.dispels.Contains(WoWDispelType.Magic)) FTWProps.dispels.Add(WoWDispelType.Magic);
            }
            if (SpellManager.HasSpell("Cleanse"))
            {
                // Paladin
                if (!FTWProps.dispels.Contains(WoWDispelType.Disease)) FTWProps.dispels.Add(WoWDispelType.Disease);
                if (!FTWProps.dispels.Contains(WoWDispelType.Poison)) FTWProps.dispels.Add(WoWDispelType.Poison);
            }
            if (SpellManager.HasSpell("Mass Dispel"))
            {
                // Priest
                if (!FTWProps.dispels.Contains(WoWDispelType.Curse)) FTWProps.dispels.Add(WoWDispelType.Curse);
                if (!FTWProps.dispels.Contains(WoWDispelType.Disease)) FTWProps.dispels.Add(WoWDispelType.Disease);
                if (!FTWProps.dispels.Contains(WoWDispelType.Magic)) FTWProps.dispels.Add(WoWDispelType.Magic);
                if (!FTWProps.dispels.Contains(WoWDispelType.Poison)) FTWProps.dispels.Add(WoWDispelType.Poison);
            }
            if (SpellManager.HasSpell("Purify"))
            {
                // Priest
                if (!FTWProps.dispels.Contains(WoWDispelType.Disease)) FTWProps.dispels.Add(WoWDispelType.Disease);
                if (!FTWProps.dispels.Contains(WoWDispelType.Magic)) FTWProps.dispels.Add(WoWDispelType.Magic);
            }
            if (SpellManager.HasSpell("Sacred Cleansing") ||
                SpellManager.HasSpell("Nature's Cure") ||
                SpellManager.HasSpell("Improved Cleanse Spirit"))
            {
                if (!FTWProps.dispels.Contains(WoWDispelType.Magic)) FTWProps.dispels.Add(WoWDispelType.Magic);
            }
            if (FTWProps.dispels.Count > 0)
            {
                FTWLogger.log("Player can dispel the following:");
                foreach (WoWDispelType d in FTWProps.dispels)
                    FTWLogger.log("    {0}", d.ToString());
            }

            MyTimer.Stop(fnname);

        }

        public void Initialize()
        {
            Pulse();
            FTWCoreStatus.On_DumpParty();
            EvaluateRules("@INITIALIZE");
        }

        public void Pulse()
        {
            string fnname = "FTWCore.Pulse";
            MyTimer.Start(fnname);
            try
            {

                if (!FTWUtils.ValidState())
                {
                    // Do nothing
                    FTWLogger.log(Color.Red, "Not valid state");
                }
                else
                {
                    // Get lists of interesting people

                    // Party or raid members
                    FTWProps.people = FTWCoreUnits.GetGroup();

                    // Tank
                    FTWProps.tank = FTWCoreUnits.GetTank();

                    // Healer
                    FTWProps.healer = FTWCoreUnits.GetHealer();

                    // Party members within range
                    FTWProps.closePeople = FTWProps.people.Where(p => p.DistanceCalc() <= 40).ToList();

                    // Party members within range, in line of sight, that need healing
                    FTWProps.healTarget = FTWCoreUnits.GetHealTarget();

                    // Diseased party member
                    // Only tanks and me get dispels, the rest can stay sick.
                    // A necessary optimization to keep the speed up.
                    FTWProps.cleanseTarget = (from unit in FTWProps.closePeople
                                     where unit.Role().Contains("Tank") || unit.Guid == StyxWoW.Me.Guid
                                     where unit.EligibleForCleanse() == true
                                     orderby unit.HealWeight()
                                     select unit).FirstOrDefault();

                    // Dead party member outside combat
                    FTWProps.reviveTarget = (from unit in FTWProps.closePeople
                                    where unit.IsDead || unit.IsGhost
                                    select unit).FirstOrDefault();
                    if (FTWProps.reviveTarget != null)
                        FTWLogger.log(Color.Red, "{0} is dead - revive him if you can.", FTWProps.reviveTarget.SafeName());

                    // Get average health of all party members.
                    try
                    {
                        FTWProps.avgHealth = (int)(from p in FTWProps.closePeople where p.IsDead == false select p.HealthPercent).Average();
                    }
                    catch (Exception ex)
                    {
                        FTWProps.avgHealth = (int)StyxWoW.Me.HealthPercent;
                    }

                    // Get mobs fighting us
                    FTWProps.adds = FTWCoreUnits.GetAdds();

                    // Get mobs fighting us, that we're not targeting
                    WoWUnit pettarget = null;
                    if (StyxWoW.Me.GotAlivePet)
                        pettarget = StyxWoW.Me.Pet.CurrentTarget;
                    FTWProps.nontargetadds = (from unit in FTWProps.adds
                                     where unit != StyxWoW.Me.CurrentTarget && unit != pettarget
                                     select unit).ToList();

                    // Get a mob fighting us, that we're not targeting.
                    FTWProps.add = FTWProps.nontargetadds.FirstOrDefault();
                }
            }
            catch (Exception ex)
            {
                FTWLogger.log(Color.Red, ex.ToString());

            }
            MyTimer.Stop(fnname);
        }

        public bool EvaluateRules(String desiredsection)
        {
            FTWLogger.log("HasAura = " + StyxWoW.Me.HasAura("Serendipity"));
            FTWLogger.log("HasMyAura = " + StyxWoW.Me.HasMyAura("Serendipity"));

            string fnname = string.Format("FTWCore.EvaluateRules {0}", desiredsection);
            MyTimer.Start(fnname);

            FTWProps.mode = desiredsection;
            string result = string.Empty;

            List<String> origlines = FTWProps.rules[FTWProps.ClassAndSpec].Split('\n').ToList();

            // Replace left side of conditions with current values
            String s;
            MyTimer.Start("FTWCore.EvaluateRules.Replace");
            using (StyxWoW.Memory.AcquireFrame())
            {
                this.StartReplace();
                s = FTWProps.rules[FTWProps.ClassAndSpec];
                s = this.Replace("Me", s, StyxWoW.Me);
                s = this.Replace("Target", s, StyxWoW.Me.CurrentTarget);
                s = this.Replace("Tank", s, FTWProps.tank);
                s = this.Replace("Healer", s, FTWProps.healer);
                s = this.Replace("Heal", s, FTWProps.healTarget);
                s = this.Replace("Pet", s, StyxWoW.Me.Pet);
                s = this.Replace("Cleanse", s, FTWProps.cleanseTarget);
                s = this.Replace("Revive", s, FTWProps.reviveTarget);
                s = this.Replace("Add", s, FTWProps.add);
            }
            MyTimer.Stop("FTWCore.EvaluateRules.Replace");

            MyTimer.Start("FTWCore.EvaluateRules.Remainder");
            List<String> lines = s.Split('\n').ToList();
            lines.Add("@END OF FILE");

            for (int i = 0; i < lines.Count; i++)
                lines[i] = lines[i].Replace("\n", "").Replace("\r", "");
            for (int i = 0; i < origlines.Count; i++)
                origlines[i] = origlines[i].Replace("\n", "").Replace("\r", "");

            string section = null;
            string action = null;
            List<string> conditions = new List<string>();
            List<string> output = new List<string>();

            for (int i = 0; i < lines.Count; i++)
            {
                // Skip blank lines
                if (lines[i].Replace("\t", "").Trim().Length == 0 || lines[i].Trim().StartsWith("--"))
                    continue;

                if (section == desiredsection)
                {
                    // Only process lines in the correct section
                    if (lines[i].StartsWith("\t"))
                    {
                        // New condition
                        conditions.Add(lines[i]);
                        output.Add(string.Format("{0:D3} {1} {2}", i + 1, origlines[i].Replace("\t", "    ").Replace("\"", "'"), lines[i].Replace("\t", "    ").Replace("\"", "'")));
                    }
                    else
                    {
                        // Finish off old action
                        bool ConditionsMatch = true;
                        if (action != null)
                        {
                            foreach (string check in conditions)
                            {
                                if (ConditionsMatch)
                                {
                                    //FTWLogger.debug(check + " - " + action + " - " + i);
                                    ConditionsMatch = EvaluateCondition(check, action, i);
                                }
                            }
                            if (!ConditionsMatch)
                                result = "SKIPPED";
                            else if (FTWCoreActions.ExecuteAction(action))
                                result = "TRUE";
                            else
                                result = "FALSE";

                            output.Add(string.Format("        {0}", result));
                            if (result == "TRUE")
                            {
                                //foreach (string xx in output)
                                //    FTWLogger.debug(xx);
                                MyTimer.Stop("FTWCore.EvaluateRules.Remainder");
                                MyTimer.Stop(fnname);
                                return true;
                            }
                            //else
                            //{
                                //foreach (string xx in output)
                                //    FTWLogger.debug(result + " - " + xx);
                            //}
                            //if (action == "StopCasting")
                            //    foreach (string xx in output)
                            //        FTWLogger.debug(xx);
                        }
                        output = new List<string>();
                        conditions.Clear();
                        action = null;

                        // New action
                        if (!lines[i].StartsWith("@"))
                        {
                            action = lines[i];
                            output.Add(string.Format("{0:D3} {1}", i + 1, action));
                        }
                    }
                }
                if (lines[i].StartsWith("@"))
                {
                    // New section
                    section = lines[i];
                }
            }

            MyTimer.Stop("FTWCore.EvaluateRules.Remainder");
            MyTimer.Stop(fnname);
            return false;
        }

        private bool EvaluateCondition(string condition, string action, int line)
        {
            string fnname = string.Format("FTWCore.EvaluateCondition {0}", FTWProps.mode);
            MyTimer.Start(fnname);
            bool retval = true;
            string[] lines;
            string origcondition = condition;
            condition = condition.Replace("\t", "");
            while (condition.StartsWith(" "))
                condition = condition.Substring(1, condition.Length - 1);
            condition = condition.Replace("  ", " ");
            if (condition.Length < 2)
            {
                retval = true;
                goto done;
            }
            lines = condition.Split(new Char[] { ' ' });
            double value1 = 0;
            double value2 = 0;
            if (lines.Length != 3)
            {
                FTWLogger.log(Color.Red, "Invalid condition found when evaluating action {0} line {1} - need 3 words '{2}'", action, line.ToString(), origcondition);
                retval = false;
                goto done;
            }
            try
            {
                value1 = System.Double.Parse(lines[0]);
            }
            catch (Exception ex)
            {
                FTWLogger.log(Color.Red, "Bad number on left side found when evaluating action {0} line {1} - '{2}' ({3})", action, line.ToString(), lines[0], ex.Message);
                retval = false;
                goto done;
            }
            string op = lines[1];
            try
            {
                value2 = System.Double.Parse(lines[2]);
            }
            catch (Exception ex)
            {
                FTWLogger.log(Color.Red, "Bad number on right side found when evaluating action {0} line {1} - '{2}' ({3})", action, line.ToString(), lines[2], ex.Message);
                retval = false;
                goto done;
            }
            if (op == "=")
            {
                if (value1 == value2)
                    retval = true;
                else
                    retval = false;
                goto done;
            }
            if (op == "!=" || op == "<>")
            {
                if (value1 != value2)
                    retval = true;
                else
                    retval = false;
                goto done;
            }
            if (op == ">=")
            {
                if (value1 >= value2)
                    retval = true;
                else
                    retval = false;
                goto done;
            }
            if (op == "<=")
            {
                if (value1 <= value2)
                    retval = true;
                else
                    retval = false;
                goto done;
            }
            if (op == ">")
            {
                if (value1 > value2)
                    retval = true;
                else
                    retval = false;
                goto done;
            }
            if (op == "<")
            {
                if (value1 < value2)
                    retval = true;
                else
                    retval = false;
                goto done;
            }
            FTWLogger.log(Color.Red, "Unknown operator {0} when processing {1} line {2}!", op, action, line.ToString());
            retval = false;
            goto done;

        done:
            MyTimer.Stop(fnname);
            return retval;
        }

        public void StartReplace()
        {
            FTWProps.properties = new Dictionary<ulong, Dictionary<string, double>>();
        }

        public double GetProperty(WoWUnit unit, string name)
        {
            // Check the dictionary first
            ulong guid;
            if (unit != null)
                guid = unit.Guid;
            else
                guid = 0;
            Dictionary<string, double> values;
            double value = 0;
            if (!FTWProps.properties.ContainsKey(guid))
            {
                values = new Dictionary<string, double>();
                FTWProps.properties[guid] = values;
            }
            else
            {
                values = FTWProps.properties[guid];
            }
            if (!values.ContainsKey(name))
            {
                value = GetPropValue(unit, name);
                values[name] = value;
            }
            else
            {
                value = values[name];
            }
            return value;

        }

        private double GetPropValue(WoWUnit theunit, string name)
        {
            double value = 0;
            switch (name)
            {
                case "IsHostile": value = theunit != null && theunit.IsHostile ? 1 : 0; break;
                case "AvgHealth": value = FTWProps.avgHealth; break;
                case "AddsCount": value = FTWProps.adds.Count; break;
                case "StunCount": value = theunit != null ? FTWCoreStatus.StunCount(theunit.Location) : 0; break;
                case "Aggro": value = theunit != null ? (int)theunit.ThreatInfo.ThreatStatus : 5; break;
                case "MovementDisabled": value = theunit != null && FTWUtils.MovementDisabled() ? 1 : 0; break;
                case "ClusterSize": value = theunit != null ? theunit.ClusterSize() : 0; break;
                case "CapsLock": value = FTWUtils.CapsLockDown() ? 1 : 0; break;
                case "BearForm": value = theunit != null && theunit.HasAura("Bear Form") ? 1 : 0; break;
                case "CatForm": value = theunit != null && theunit.HasAura("Cat Form") ? 1 : 0; break;
                case "MoonkinForm": value = theunit != null && theunit.HasAura("Moonkin Form") ? 1 : 0; break;
                case "NormalForm": value = theunit != null && (theunit.HasAura("Cat Form") == false && theunit.HasAura("Bear Form") == false && theunit.HasAura("Moonkin Form") == false) ? 1 : 0; break;
                case "FlightForm": value = theunit != null && (theunit.HasAura("Flight Form") || theunit.HasAura("Swift Flight Form")) ? 1 : 0; break;
                case "FeralForm": value = theunit != null && (theunit.HasAura("Bear Form") || theunit.HasAura("Cat Form")) ? 1 : 0; break;
                case "ComboPoints": value = StyxWoW.Me.ComboPoints; break;
                case "AllComboPoints": value = StyxWoW.Me.RawComboPoints; break;
                case "Rage": value = StyxWoW.Me.RageInfo.CurrentI; break;
                case "Focus": value = StyxWoW.Me.FocusInfo.CurrentI; break;
                case "Energy": value = StyxWoW.Me.EnergyInfo.CurrentI; break;
                case "ShadowOrbs": value = StyxWoW.Me.GetPowerInfo(WoWPowerType.ShadowOrbs).CurrentI; break;
                case "SoulShards": value = StyxWoW.Me.SoulShardsInfo.CurrentI; break;
                case "Balance": value = StyxWoW.Me.UnitPower(8); break;
                case "HolyPower": value = StyxWoW.Me.GetPowerInfo(WoWPowerType.HolyPower).CurrentI; break;
                case "Chi": value = StyxWoW.Me.UnitPower(12); break;
                case "BurningEmbers": value = StyxWoW.Me.GetPowerInfo(WoWPowerType.BurningEmbers).CurrentI; break;
                case "DemonicFury": value = StyxWoW.Me.GetPowerInfo(WoWPowerType.DemonicFury).CurrentI; break;
                case "EclipseDirection": value = FTWProps._eclipsedirection; break;
                case "Distance": value = theunit != null ? theunit.Distance2D : 0; break;
                case "MeleeRange": value = 4.95; break;
                case "IsTank": value = StyxWoW.Me.IsTank() ? 1 : 0; break;
                case "IsHealer": value = StyxWoW.Me.IsHealer() ? 1 : 0; break;
                case "IsDPS": value = StyxWoW.Me.IsDPS() ? 1 : 0; break;
                case "IsDemon": value = theunit != null && theunit.CreatureType == WoWCreatureType.Demon ? 1 : 0; break;
                case "IsElemental": value = theunit != null && theunit.CreatureType == WoWCreatureType.Elemental ? 1 : 0; break;
                case "IsBeast": value = theunit != null && theunit.CreatureType == WoWCreatureType.Beast ? 1 : 0; break;
                case "IsCritter": value = theunit != null && theunit.CreatureType == WoWCreatureType.Critter ? 1 : 0; break;
                case "IsDragon": value = theunit != null && theunit.CreatureType == WoWCreatureType.Dragon ? 1 : 0; break;
                case "IsGasCloud": value = theunit != null && theunit.CreatureType == WoWCreatureType.GasCloud ? 1 : 0; break;
                case "IsGiant": value = theunit != null && theunit.CreatureType == WoWCreatureType.Giant ? 1 : 0; break;
                case "IsHumanoid": value = theunit != null && theunit.CreatureType == WoWCreatureType.Humanoid ? 1 : 0; break;
                case "IsMechanical": value = theunit != null && theunit.CreatureType == WoWCreatureType.Mechanical ? 1 : 0; break;
                case "IsNonCombatPet": value = theunit != null && theunit.CreatureType == WoWCreatureType.NonCombatPet ? 1 : 0; break;
                case "IsTotem": value = theunit != null && theunit.CreatureType == WoWCreatureType.Totem ? 1 : 0; break;
                case "IsUndead": value = theunit != null && theunit.CreatureType == WoWCreatureType.Undead ? 1 : 0; break;
                case "Health": value = theunit != null ? (int)theunit.HealthPercent : 100; break;
                case "Mana": value = theunit != null && (theunit.PowerType == WoWPowerType.Mana || theunit.Class == WoWClass.Druid) ? theunit.ManaPercent : 100; break;
                case "Mounted": value = theunit != null && (theunit.Mounted) ? 1 : 0; break;
                case "InBattleground": value = Battlegrounds.IsInsideBattleground ? 1 : 0; break;
                case "InParty": value = StyxWoW.Me.GroupInfo.IsInParty || StyxWoW.Me.GroupInfo.IsInRaid ? 1 : 0; break;
                case "InRaid": value = StyxWoW.Me.GroupInfo.IsInRaid ? 1 : 0; break;
                case "IsDiseased": value = theunit != null && theunit.IsDiseased() ? 1 : 0; break;
                case "Dead": value = theunit != null && theunit.IsDead ? 1 : 0; break;
                case "IsCasting": value = theunit != null && (theunit.IsCasting || theunit.IsChanneling) ? 1 : 0; break;
                case "IsMoving": value = theunit != null && theunit.IsMoving ? 1 : 0; break;
                case "IsFlying": value = theunit != null && theunit.IsFlying ? 1 : 0; break;
                case "LineOfSight": value = theunit != null && theunit.InLineOfSight ? 1 : 0; break;
                case "Interruptable": value = theunit != null && theunit.CanInterruptCurrentSpellCast ? 1 : 0; break;
                case "IsElite": value = theunit != null && (theunit.Elite || theunit.Name.Contains("Training Dummy")) ? 1 : 0; break;
                case "IsBehind": value = theunit != null && theunit.CurrentTarget != null && theunit.CurrentTarget.MeIsSafelyBehind ? 1 : 0; break;
                case "IsFacingTarget": value = theunit != null && theunit.CurrentTarget != null && theunit.IsSafelyFacing(theunit.CurrentTarget) ? 1 : 0; break;
                case "IsFleeing": value = theunit != null && theunit.Fleeing ? 1 : 0; break;
                case "IsIncapacitated": value = theunit != null && (theunit.IsDead || theunit.IsCrowdControlled()) ? 1 : 0; break;
                case "IsRooted": value = theunit != null && theunit.HasAuraWithMechanic(WoWSpellMechanic.Rooted, WoWSpellMechanic.Shackled) ? 1 : 0; break;
                case "IsLooting": value = BotPoi.Current.Type == PoiType.Loot ? 1 : 0; break;
                case "PetIsMissing": value = StyxWoW.Me.PetIsMissing(); break;
                case "TotemCount": value = theunit != null ? FTWCoreStatus.TotemCount() : 0; break;
                case "RuneCount": value = StyxWoW.Me.DeathRuneCount +
                    StyxWoW.Me.FrostRuneCount +
                    StyxWoW.Me.BloodRuneCount +
                    StyxWoW.Me.UnholyRuneCount; break;
                case "DeathRune": value = StyxWoW.Me.DeathRuneCount; break;
                case "FrostRune": value = StyxWoW.Me.FrostRuneCount; break;
                case "BloodRune": value = StyxWoW.Me.BloodRuneCount; break;
                case "UnholyRune": value = StyxWoW.Me.UnholyRuneCount; break;
                case "RunicPower": value = StyxWoW.Me.RunicPowerPercent; break;
                case "LevelDiff": value = theunit != null ? theunit.Level - StyxWoW.Me.Level : 0; break;
                case "Level": value = theunit != null ? theunit.Level : 0; break;
                default: throw new Exception(string.Format("Unknown property {0}!", name));
            }
            return value;
        }

        private string Replace(string prefix, string s, WoWUnit theunit)
        {
            string fnname = "FTWCore.Replace";
            MyTimer.Start(fnname);
            if (theunit != null && theunit.Guid == StyxWoW.Me.Guid)
            {
                if (StyxWoW.Me.HasAura("Eclipse (Solar)"))
                    FTWProps._eclipsedirection = -1;
                else if (StyxWoW.Me.HasAura("Eclipse (Lunar)"))
                    FTWProps._eclipsedirection = 1;
            }

            // Replace aura checks with parenthese (Target.HasMyAura("Bad Aura") > 3)
            string findstring = string.Format(@"{0}\.(?<action>.*)\(""(?<aura>.*)""\)", prefix);
            Regex rg = new Regex(findstring);
            Match match = rg.Match(s);
            Dictionary<String, Object> d = new Dictionary<String, Object>();
            while (match.Success)
            {
                if (!d.ContainsKey(match.Value))
                {
                    string action = match.Groups["action"].Value;
                    string aura = match.Groups["aura"].Value;
                    int value = 0;
                    if (false) { }
                    else if (action == "Weapon1HasAura") value = (theunit != null && FTWCoreItems.WeaponEnchant(1) == aura) ? 1 : 0;
                    else if (action == "Weapon2HasAura") value = (theunit != null && FTWCoreItems.WeaponEnchant(2) == aura) ? 1 : 0;
                    else if (action == "AuraExpiring") value = (theunit != null) ? theunit.AuraExpiring(aura) : 0;
                    else if (action == "CanCast") value = (theunit != null && SpellManager.CanCast(aura, theunit)) ? 1 : 0;
                    else if (action == "ClearBehindMe") value = (theunit != null && StyxWoW.Me.ClearBehindMe(aura) ? 1 : 0);
                    else if (action == "HasAura") value = (theunit != null && theunit.HasAura(aura)) ? 1 : 0;
                    else if (action == "HasItem") value = StyxWoW.Me.HasItem(aura) ? 1 : 0;
                    else if (action == "HasMyAura") value = (theunit != null && theunit.HasMyAura(aura)) ? 1 : 0;
                    else if (action == "HasSpell") value = (StyxWoW.Me.HasSpell(aura)) ? 1 : 0;
                    else if (action == "HasTotem") value = FTWCoreStatus.HasTotem(aura) ? 1 : 0;
                    else if (action == "IsCasting") value = (theunit != null && theunit.CurrentSpellName() == aura) ? 1 : 0;
                    else if (action == "ItemOnCooldown") value = FTWCoreItems.ItemOnCooldown(aura) ? 1 : 0;
                    else if (action == "MyAuraExpiring") value = (theunit != null) ? theunit.MyAuraExpiring(aura) : 0;
                    else if (action == "MyStackCount") value = (theunit != null) ? theunit.MyStackCount(aura) : 0;
                    else if (action == "OnCooldown") value = FTWCoreStatus.OnCooldown(aura) ? 1 : 0;
                    else if (action == "PartyWithAura") value = FTWCoreUnits.GetPartyWithAura(aura);
                    else if (action == "PartyWithHealth") value = FTWCoreUnits.GetPartyWithHealth(aura);
                    else if (action == "StackCount") value = (theunit != null) ? theunit.StackCount(aura) : 0;
                    else if (action == "NumItems") value = (theunit != null) ? FTWCoreItems.NumItems(aura) : 0;
                    else throw new Exception(string.Format("Unknown action {0}!", action));
                    d.Add(match.Value, 0);
                    s = s.Replace(match.Value, value.ToString());
                }
                match = match.NextMatch();

            }

            // Replace simple properties
            for (int i = 0; i < FTWProps.PropertyNames.Count(); i++)
            {
                string propname = FTWProps.PropertyNames[i].Trim();
                if (propname.Length > 0)
                {
                    string search = prefix + "." + propname;
                    if (s.Contains(search))
                        s = s.Replace(search, GetProperty(theunit, propname).ToString());
                }
            }

            // Stop the timer
            MyTimer.Stop(fnname);

            return s;
        }
    }
}
