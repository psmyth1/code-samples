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
    static class FTWCoreActions
    {
        public static bool ExecuteAction(string action)
        {
            string fnname = "FTWCore.ExecuteAction";
            string subfn = string.Format("FTWCore.ExecuteAction '{0}'", action);
            MyTimer.Start(fnname);
            MyTimer.Start(subfn);
            bool retval = false;
            WoWUnit Me = StyxWoW.Me;
            if (action == null)
                throw new Exception("ExecuteAction - received null action");
            action = action.Replace("\t", "");
            while (action.StartsWith(" "))
                action = action.Substring(1, action.Length - 1);
            action = action.Replace("  ", " ");
            if (!action.Contains("."))
                action = "Target.Cast " + action;

            if (action == "Target.Cast Blacklist" && Me.CurrentTarget != null)
            {
                FTWLogger.log(Color.Violet, "Blackisting {0} for 60 seconds", Me.CurrentTarget.SafeName());
                Blacklist.Add(Me.CurrentTarget, TimeSpan.FromSeconds(60));
                StyxWoW.Me.ClearTarget();
                retval = true;
            }
            else
            {
                // Get first and last part of string
                string lastpart = string.Empty;
                string firstpart = string.Empty;

                int index = action.IndexOf(" ");
                if (index > -1)
                {
                    firstpart = action.Substring(0, index);
                    lastpart = action.Substring(index + 1, action.Length - index - 1);
                }
                else
                {
                    firstpart = action;
                    lastpart = string.Empty;
                }

                // Get target of action
                string[] words = firstpart.Split('.');
                WoWUnit target = null;
                switch (words[0])
                {
                    case "Me": target = Me; break;
                    case "Target": target = Me.CurrentTarget; break;
                    case "Tank": target = FTWProps.tank; break;
                    case "Healer": target = FTWProps.healer; break;
                    case "Heal": target = FTWProps.healTarget; break;
                    case "Revive": target = FTWProps.reviveTarget; break;
                    case "Cleanse": target = FTWProps.cleanseTarget; break;
                    case "Pet": target = Me.Pet; break;
                    case "Add": target = FTWProps.add; break;
                    default: target = null; break;

                }
                if (target == null)
                {
                    retval = false;
                }
                else
                {
                    switch (words[1])
                    {

                        // Actions that use targets (Me, Target, Tank, etc from the list above.)
                        case "DebugCast": retval = On_Cast(firstpart, lastpart, target, false, false, true); break;
                        case "Cast": retval = On_Cast(firstpart, lastpart, target, false, false); break;
                        case "DebugCastNow": retval = On_Cast(firstpart, lastpart, target, true, false, true); break;
                        case "CastNow": retval = On_Cast(firstpart, lastpart, target, true, false); break;
                        case "StopCasting": retval = On_StopCasting(lastpart); break;
                        case "DebugCastOnce": retval = On_Cast(firstpart, lastpart, target, true, true, true); break;
                        case "CastOnce": retval = On_Cast(firstpart, lastpart, target, true, true); break;
                        case "DumpAuras": retval = FTWCoreStatus.On_DumpAuras(target); break;
                        case "DumpParty": retval = FTWCoreStatus.On_DumpParty(); break;
                        case "PetCast": retval = On_PetCast(lastpart, target, false); break;
                        case "PetCastNow": retval = On_PetCast(lastpart, target, true); break;
                        case "Use": retval = FTWCoreItems.On_Use(lastpart, target); break;

                        // Actions that don't use targets (don't care what the prefix is - can be any from the list above)
                        case "PullMore": retval = On_PullMore(firstpart, lastpart); break;
                        case "ImbueWeapon1": retval = FTWCoreItems.ImbueWeapon(lastpart, "mainhand", 1); break;
                        case "ImbueWeapon2": retval = FTWCoreItems.ImbueWeapon(lastpart, "offhand", 2); break;
                        case "CastAll": retval = On_CastAll(firstpart, lastpart); break;
                        case "InterruptAny": retval = On_Interrupt(firstpart, lastpart); break;
                        case "ExecuteAny": retval = On_Execute(firstpart, lastpart); break;
                        case "ParalyzeAny": retval = On_Paralyze(firstpart, lastpart); break;
                        case "Message": retval = false; FTWLogger.log(lastpart); break;
                        case "Range": retval = false; FTWProps.range = double.Parse(lastpart); FTWLogger.log("Combat range set to {0:0.00}", FTWProps.range); break;
                        case "ClipTime": retval = false; FTWProps.cliptime = Int32.Parse(lastpart); FTWLogger.log("Spells will be clipped with {0} ms remaining cast time.", FTWProps.cliptime); break;
                        case "Eat": retval = FTWCoreItems.On_Eat(); break;
                        case "Drink": retval = FTWCoreItems.On_Drink(); break;
                        case "UseBandage": retval = FTWCoreItems.On_UseBandage(); break;
                        case "UseHealthPotion": retval = FTWCoreItems.On_UseHealthPotion(); break;
                        case "UseManaPotion": retval = FTWCoreItems.On_UseManaPotion(); break;
                        case "FollowTarget": retval = FTWCoreMovement.FollowTarget(); break;
                        case "FindBetterTarget": retval = On_FindBetterTarget("by script request"); break;
                        case "PetAttack": retval = On_PetAttack(); break;
                        case "AutoAttack": retval = On_AutoAttack(); break;
                        case "OnCooldown": retval = FTWCoreStatus.OnCooldown(lastpart); break;
                        case "Macro": retval = false; Macro(lastpart); break;
                        case "LootChestsOn": CharacterSettings.Instance.LootChests = true; break;
                        case "LootChestsOff": CharacterSettings.Instance.LootChests = false; break;
                        case "GrabAggro": retval = On_GrabAggro(); break;
                        case "LeaveEarly": retval = true; break;

                        // Unknown action
                        default: retval = On_UnimplementedAction(action); break;
                    }
                }

            }

            MyTimer.Stop(subfn);
            MyTimer.Stop(fnname);
            return retval;

        }

        public static bool On_PetAttack()
        {
            bool retval;
            string fnname = "FTWCore.On_PetAttack";
            MyTimer.Start(fnname);
            using (StyxWoW.Memory.AcquireFrame())
            {
                if (!(StyxWoW.Me.GotAlivePet))
                {
                    FTWLogger.log(Color.Red, "Don't have alive pet");
                    retval = false;
                }
                else
                {
                    WoWUnit pet = StyxWoW.Me.Pet;
                    if (pet.CurrentTargetGuid == StyxWoW.Me.CurrentTargetGuid)
                    {
                        retval = false;
                    }
                    else
                    {
                        FTWLogger.log("    Siccing pet on {0} health {1:0} dist {2:0.0}", StyxWoW.Me.CurrentTarget.SafeName(), StyxWoW.Me.CurrentTarget.HealthPercent, StyxWoW.Me.CurrentTarget.DistanceCalc());
                        foreach (WoWPetSpell sp in StyxWoW.Me.PetSpells)
                        {
                            if (sp.Action.ToString() == "Attack")
                            {
                                Lua.DoString("CastPetAction({0})", sp.ActionBarIndex + 1);
                                break;
                            }
                        }
                        retval = false;
                    }
                }
            }
            MyTimer.Stop(fnname);
            return retval;
        }

        public static bool On_StopCasting(string spellname)
        {

            string currentspellname = string.Empty;
            string currentchannelname = string.Empty;
            if (StyxWoW.Me.CastingSpell != null)
                currentspellname = StyxWoW.Me.CastingSpell.Name;
            if (StyxWoW.Me.ChanneledSpell != null)
                currentspellname = StyxWoW.Me.ChanneledSpell.Name;
            if (spellname == currentspellname || spellname == currentchannelname)
            {
                SpellManager.StopCasting();
                return true;
            }
            return false;
        }

        public static bool On_Cast(string firstpart, string spellname, WoWUnit target, bool castnow, bool castonce, bool debugspell = false)
        {
            string fnname = "FTWCore.On_Cast";
            MyTimer.Start(fnname);
            LocalPlayer Me = StyxWoW.Me;
            WoWSpell spell = null;
            bool retval = true;
            Color ds = Color.Magenta;

            if (target != null && !target.IsFriendly && target.IsDead)
            {
                if (debugspell) FTWLogger.log(ds, "Target is hostile and dead");
                MyTimer.Stop(fnname);
                return false;
            }

            if (FTWCoreStatus.OnCooldown(spellname, debugspell))
            {
                MyTimer.Stop(fnname);
                return false;
            }

            if (target != null && !target.IsFriendly && !FTWUtils.MovementDisabled())
                FTWCoreMovement.Face(target);

            // Clear out expired CastOnce entries (older than CastOnceTime seconds)
            foreach (KeyValuePair<String, DateTime> kvp in FTWProps.CastOnce.ToList())
            {
                if (DateTime.Now > kvp.Value)
                    FTWProps.CastOnce.Remove(kvp.Key);
            }

            // Leave early if CastOnce contains unexpired entry for this unit
            if (FTWProps.CastOnce.ContainsKey(spellname + target.Guid.ToString()))
            {
                if (debugspell)
                    FTWLogger.log(ds, "Already cast {0} on {1}", spellname, target.Name);
                MyTimer.Stop(fnname);
                return false;
            }

            if (SpellManager.GlobalCooldown)
            {
                if (debugspell)
                    FTWLogger.log(ds, "...");
                MyTimer.Stop(fnname);
                return false;
            }

            try
            {
                if (FTWProps.fakecooldowns.ContainsKey(spellname))
                    spell = WoWSpell.FromId(FTWProps.fakecooldowns[spellname].SpellID);
                else if (SpellManager.Spells.ContainsKey(spellname))
                    spell = SpellManager.Spells[spellname];
                else
                {
                    FTWLogger.debug(Color.Gray, "Unknown spell {0}", spellname);
                    MyTimer.Stop(fnname);
                    return false;
                }
            }
            catch (Exception ex)
            {
                FTWLogger.log(Color.Pink, "Error when getting spell {0}: {1}", spellname, ex.Message);
                MyTimer.Stop(fnname);
                return false;
            }

            if (spell == null)
            {
                FTWLogger.debug(Color.Gray, "Unknown spell '{0}'", spellname);
                MyTimer.Stop(fnname);
                return false;
            }

            // Check whether or not you know the spell according to WoW
            if (false) // leave commented out for now
            {
                List<string> known = Lua.GetReturnValues(String.Format("return IsSpellKnown({0})", spell.Id), "SpellKnown.lua");
                int knownspell = Int32.Parse(known[0]);
                if (knownspell == 0)
                {
                    FTWLogger.log(Color.Gray, "GetSpellInfo says you don't know spell {0} ({1})", spellname, known[0]);
                    MyTimer.Stop(fnname);
                    return false;
                }
            }

            if (false)
            {
                // Check power requirements
                List<string> values = Lua.GetReturnValues(String.Format("return GetSpellInfo({0})", spell.Id), "SpellInfo.lua");
                //string[] vars = {"name", "rank", "icon", "cost", "isFunnel", "powerType", "castTime", "minRange", "maxRange"};
                int powerType = Int32.Parse(values[5]);
                int powerCost = Int32.Parse(values[3]);
                string[] powertypes = { "mana", "rage", "focus", "energy", 
                                        "happiness", "runes", "runic power", "soul shards", 
                                        "eclipse", "holy power", "alternate power", "dark force", 
                                        "chi", "shadow orbs", "burning embers", "demonic fury"
                                      };
                if (StyxWoW.Me.UnitPower(powerType) < powerCost)
                {
                    FTWLogger.log(Color.Orange, "NOT ENOUGH {0} - Requires: {1}, but I have: {2}", powertypes[powerType], powerCost, StyxWoW.Me.UnitPower(powerType));
                    MyTimer.Stop(fnname);
                    return false;
                }
            }

            if (!spell.IsSelfOnlySpell)
            {
                if (target == null)
                {
                    FTWLogger.log(Color.Orange, "Can't cast {0} on null target!", spell.Name);
                    if (debugspell)
                        FTWLogger.log(ds, "Null target");
                    MyTimer.Stop(fnname);
                    return false;
                }
                double dist = target.Distance; // target.DistanceCalc();
                if ((spell.MinRange > 0 || spell.MaxRange > 0) && !(dist >= spell.MinRange && dist <= spell.MaxRange))
                {
                    FTWLogger.log(Color.Orange, "Can't cast spell {0} {1} on {2} health {3:0.0} dist {4:0.0} minrange {5} maxrange {6}", spellname, spell.Id, target.SafeName(), target.HealthPercent, target.DistanceCalc(), spell.MinRange, spell.MaxRange);
                    if (debugspell)
                        FTWLogger.log(ds, "Out of range");
                    MyTimer.Stop(fnname);
                    return false;
                }
                if (!target.InLineOfSight)
                {
                    FTWLogger.log(Color.Orange, "Can't cast spell {0} {1} on {2} health {3:0.0} dist {4:0.0} (not in line of sight)", spellname, spell.Id, target.SafeName(), target.HealthPercent, target.DistanceCalc());
                    if (debugspell)
                        FTWLogger.log(ds, "Not in line of sight. Attempts = {0}.", FTWProps.not_in_los_attempts);
                    MyTimer.Stop(fnname);

                    FTWProps.not_in_los_attempts += 1;
                    Navigator.MoveTo(target.Location);
                    Thread.Sleep(2000);
                    return false;
                }

                if (spellname == "Death Pact" && Me.GotAlivePet)
                {
                    Me.Pet.Target();
                    for (int l = 0; l < 2; l++)
                        Thread.Sleep(10);
                }

                if (FTWProps.CastOver.Contains(FTWProps.lastspellcastname))
                    retval = true;
                else if (spell.IsSelfOnlySpell)
                    retval = SpellManager.CanCast(spell, true);
                else
                    retval = SpellManager.CanCast(spell, target, true);

                if (FTWProps.IgnoreCanCast.Contains(spellname))
                {
                    if (debugspell)
                        FTWLogger.log(ds, "Ignoring cancast for {0}", spellname);
                    retval = true;
                }
                if (retval == false)
                {
                    if (spell.IsSelfOnlySpell)
                        FTWLogger.debug(Color.Orange, "CanCast returned false for {0} {1} on me", spellname, spell.Id);
                    else
                        FTWLogger.debug(Color.Orange, "CanCast returned false for {0} {1} on {2} health {3:0.0} dist {4:0.0}", spellname, spell.Id, target.SafeName(), target.HealthPercent, target.DistanceCalc());
                    MyTimer.Stop(fnname);
                    if (debugspell)
                        FTWLogger.log(ds, "CanCast returned false");
                    return false;
                }
            }

            // Leave early if still casting
            if (!castnow && (Me.IsCasting || Me.IsChanneling))
            {
                if (debugspell) FTWLogger.log(ds, "Still casting");
                return false;
            }
            // Definitely going to cast - Stop casting
            if (Me.IsCasting || Me.IsChanneling)
            {
                if (FTWProps.CastOver.Contains(FTWProps.lastspellcastname))
                    FTWLogger.log("Currently casting {0} - casting over it with {1}", FTWProps.lastspellcastname, spellname);
                else if (castnow)
                    SpellManager.StopCasting();
            }

            // Stop moving
            if (spell.CastTime > 0 && !FTWUtils.MovementDisabled())
                WoWMovement.MoveStop();

            // Clear target spell, if one is up
            if (StyxWoW.Me.CurrentPendingCursorSpell != null)
                Lua.DoString("SpellStopTargeting()");

            if (spell.IsTankOnlySpell() == true)
            {
                // Spells that are only ever cast on tanks, such as Misdirection and Tricks of the Trade.
                if (FTWProps.people.Count > 1 && FTWProps.tank.Guid != Me.Guid && FTWProps.tank.IsDead == false)
                {
                    FTWLogger.log("cast tank-only spell {0} on {1}", spell.Name, FTWProps.tank.SafeName());
                    if (SpellManager.CanCast(spell, FTWProps.tank))
                    {
                        FTWLogger.log("nope - failed cancast check.");
                        retval = SpellManager.Cast(spell, FTWProps.tank);
                    }
                }
                else if (StyxWoW.Me.GotAlivePet && Me.Pet.IsDead == false)
                {
                    FTWLogger.log("cast tank-only spell {0} on pet", spell.Name);
                    if (SpellManager.CanCast(spell, Me.Pet))
                    {
                        FTWLogger.log("nope - failed cancast check.");
                        retval = SpellManager.Cast(spell, Me.Pet);
                    }
                }
                else
                    retval = false;
            }
            else if (spell.IsAreaSpell() == false)
            {
                // Most normal spells
                if (spell.IsSelfOnlySpell)
                    retval = SpellManager.Cast(spell);
                else
                    retval = SpellManager.Cast(spell, target);

                // Post-spell processing
                if (spellname == "Feign Death")
                {
                    while (Me.HasAura("Feign Death"))
                    {
                        List<WoWUnit> mobs = (List<WoWUnit>)FTWCoreUnits.GetNearbyUnfriendlyUnits();
                        if (mobs.Count == 0 && StyxWoW.Me.HealthPercent > 95)
                            break;
                        Thread.Sleep(10);
                    }
                }
            }
            else
            {
                // Area spell
                WoWPoint loc;

                if (spell.IsSelfOnlySpell && !spell.Name.EndsWith(" Trap"))
                    loc = StyxWoW.Me.Location;
                else
                    loc = target.Location;
                retval = SpellManager.Cast(spell);
                DateTime stoptime = DateTime.Now.AddMilliseconds(500);
                while (DateTime.Now < stoptime)
                {
                    if (StyxWoW.Me.CurrentPendingCursorSpell != null)
                        break;
                    Thread.Sleep(10);
                }
                SpellManager.ClickRemoteLocation(loc);
                stoptime = DateTime.Now.AddMilliseconds(500);
                while (DateTime.Now < stoptime)
                {
                    // Clear target spell, if one is up
                    if (StyxWoW.Me.CurrentPendingCursorSpell == null)
                        break;
                    Thread.Sleep(10);
                }
                // Clear target spell, if one is up
                if (StyxWoW.Me.CurrentPendingCursorSpell != null)
                    Lua.DoString("SpellStopTargeting()");

            }

            // Add current spell to CastOnce dictionary
            if (castonce == true)
                FTWProps.CastOnce[spellname + target.Guid.ToString()] = DateTime.Now.AddSeconds(FTWProps.CastOnceTime);

            // Wait until spell starts casting
            if (spell.CastTime > 0)
            {
                DateTime dt = DateTime.Now.AddSeconds(1.5);
                while (DateTime.Now < dt && !StyxWoW.Me.IsCasting && !StyxWoW.Me.IsChanneling)
                    Thread.Sleep(10);
            }

            // Save spell cooldown
            if (retval == true)
            {
                FTWLogger.log("    {0} {1} on {2} {3} health {4:0} dist {5:0.0} aggro {6} {7} (addscount {8})", firstpart, spellname, target.SafeName(), target.ShortGuid(), target.HealthPercent, target.DistanceCalc(), (int)target.ThreatInfo.ThreatStatus, target.ThreatInfo.ThreatStatus, FTWProps.adds.Count);
                FTWCoreStatus.SaveCooldown(spellname);
                FTWProps.MovementCooldown = DateTime.Now.Add(TimeSpan.FromMilliseconds(Math.Min(1500, spell.CastTime)));
                FTWProps.not_in_los_attempts = 0;
            }
            else
            {
                FTWLogger.log(Color.Gray, "  - Couldn't cast spell {0} on {1} {2} at dist {3:0.0}", spellname, target.SafeName(), target.ShortGuid(), target.DistanceCalc());
            }

            if (FTWProps.Stuns.Contains(spellname))
            {
                // Don't attack again for 3 seconds - hb is slow in noticing cc's.
                Blacklist.Add(target.Guid, BlacklistFlags.Combat, TimeSpan.FromSeconds(3));
                if (target.Guid == StyxWoW.Me.CurrentTargetGuid)
                    StyxWoW.Me.ClearTarget();
            }

            MyTimer.Stop(fnname);
            return retval;
        }

        public static bool On_PetCast(string spellname, WoWUnit target, bool castnow)
        {
            string fnname = "FTWCore.On_PetCast";
            MyTimer.Start(fnname);
            LocalPlayer Me = StyxWoW.Me;
            WoWPetSpell spell = null;

            // Don't even try to cast if I don't have a pet.
            if (!Me.GotAlivePet)
            {
                MyTimer.Stop(fnname);
                return false;
            }

            foreach (WoWPetSpell sp in StyxWoW.Me.PetSpells)
            {
                if (sp.Action.ToString() == spellname)
                {
                    Lua.DoString("CastPetAction({0})", sp.ActionBarIndex + 1);
                    FTWLogger.log("[Pet] Action = {0}", sp.Action.ToString());
                    break;
                }

                else if (sp.Spell != null && sp.Spell.Name == spellname)
                {
                    spell = sp;
                    break;
                }
            }
            if (spell == null)
            {
                FTWLogger.debug(Color.Gray, "[Pet] Unknown spell {0}", spellname);
                MyTimer.Stop(fnname);
                return false;
            }

            if (FTWCoreStatus.OnPetCooldown(spellname))
            {
                MyTimer.Stop(fnname);
                return false;
            }

            if (!castnow && (Me.Pet.IsCasting || Me.Pet.IsChanneling))
            {
                MyTimer.Stop(fnname);
                return false;
            }

            if (spell.Spell.MinRange > 0 && target.DistanceCalc() < spell.Spell.MinRange)
            {
                FTWLogger.debug(Color.Yellow, "[Pet] Too close to {0} to cast {1}.", target.SafeName(), spell.Spell.Name);
                MyTimer.Stop(fnname);
                return false;
            }
            if (spell.Spell.MaxRange > 0 && target.DistanceCalc() > spell.Spell.MaxRange)
            {
                FTWLogger.debug(Color.Yellow, "[Pet] Too far away to {0} to cast {1}.", target.SafeName(), spell.Spell.Name);
                MyTimer.Stop(fnname);
                return false;
            }

            string strTarget;
            if (target.Guid == StyxWoW.Me.Guid)
                strTarget = "player";
            else if (target.Guid == StyxWoW.Me.Pet.Guid)
                strTarget = "pet";
            else if (target.Guid == StyxWoW.Me.CurrentTargetGuid)
                strTarget = "target";
            else
                strTarget = null;

            if (strTarget == null)
            {
                Lua.DoString("CastPetAction({0})", spell.ActionBarIndex + 1);
                FTWLogger.log("    [Pet] Cast {0}", spell.Spell.Name);
            }
            else
            {
                Lua.DoString("CastPetAction({0}, {1})", spell.ActionBarIndex + 1, strTarget);
                FTWLogger.log("    [Pet] Cast {0} on {1} health {2:0.0} dist {3:0.0}", spell.Spell.Name, strTarget, target.HealthPercent, target.DistanceCalc());
            }

            if (spell.Spell.IsAreaSpell())
            {
                // Area spell
                WoWPoint loc;

                if (spell.Spell.IsSelfOnlySpell)
                    loc = StyxWoW.Me.Location;
                else
                    loc = target.Location;

                DateTime stoptime = DateTime.Now.AddMilliseconds(500);
                while (DateTime.Now < stoptime)
                {
                    if (StyxWoW.Me.CurrentPendingCursorSpell != null)
                        break;
                    Thread.Sleep(10);
                }
                SpellManager.ClickRemoteLocation(loc);
                stoptime = DateTime.Now.AddMilliseconds(500);
                while (DateTime.Now < stoptime)
                {
                    // Clear target spell, if one is up
                    if (StyxWoW.Me.CurrentPendingCursorSpell == null)
                        break;
                    Thread.Sleep(10);
                }
                // Clear target spell, if one is up
                if (StyxWoW.Me.CurrentPendingCursorSpell != null)
                    Lua.DoString("SpellStopTargeting()");
            }

            FTWCoreStatus.SaveCooldown(spell.Spell.Name);

            MyTimer.Stop(fnname);

            // We have no way of knowing if this spell was successfully cast or not.
            // Therefore, return false so it doesn't stop the action sequence.
            return false;

        }

        public static bool On_Interrupt(string firstpart, string spellname)
        {
            // Interrupts the spellcaster furthest away from you
            string fnname = "FTWCore.On_Interrupt";
            MyTimer.Start(fnname);
            int range = 5;
            WoWSpell spell = null;
            try
            {
                if (FTWProps.fakecooldowns.ContainsKey(spellname))
                    spell = WoWSpell.FromId(FTWProps.fakecooldowns[spellname].SpellID);
                else
                    spell = SpellManager.Spells[spellname];
            }
            catch (KeyNotFoundException ex) { }
            if (spell == null || spell.CooldownTimeLeft.TotalMilliseconds > 0)
            {
                MyTimer.Stop(fnname);
                return false;
            }
            range = Math.Max(range, (int)spell.MaxRange);
            WoWUnit castingmob = (from a in FTWProps.adds
                                  where a.HealthPercent > 30
                                  where a.InLineOfSight
                                  where (a.IsCasting == true || a.IsChanneling == true)
                                  where a.Distance < range
                                  where a.CanInterruptCurrentSpellCast == true
                                  orderby a.Distance descending
                                  select a).FirstOrDefault();
            if (castingmob == null)
            {
                MyTimer.Stop(fnname);
                return false;
            }
            if (FTWUtils.MovementDisabled())
                FTWLogger.log(Color.Violet, "MOVEMENT DISABLED - Not facing target on interrupt!");
            else
                FTWCoreMovement.Face(castingmob);
            bool retval = On_Cast(firstpart, spellname, castingmob, true, false);
            if (retval)
            {
                string effect1 = "";
                try
                {
                    effect1 = WoWSpell.FromId((int)castingmob.CurrentCastId).SpellEffect1.ToString();
                }
                catch (Exception ex)
                {
                }
                FTWLogger.log(Color.GreenYellow, "    Interrupted {0} with {1} dist {2:0.0} effect {3}", castingmob.SafeName(), spellname, castingmob.Distance, effect1);
            }
            MyTimer.Stop(fnname);
            return retval;
        }

        public static bool On_Execute(string firstpart, string spellname)
        {
            // Interrupts the spellcaster furthest away from you
            string fnname = "FTWCore.On_Execute";
            MyTimer.Start(fnname);
            int range = 5;
            WoWSpell spell = null;
            try
            {
                if (FTWProps.fakecooldowns.ContainsKey(spellname))
                    spell = WoWSpell.FromId(FTWProps.fakecooldowns[spellname].SpellID);
                else
                    spell = SpellManager.Spells[spellname];
            }
            catch (KeyNotFoundException ex) { }
            if (spell == null || spell.CooldownTimeLeft.TotalMilliseconds > 0)
            {
                MyTimer.Stop(fnname);
                return false;
            }
            range = Math.Max(range, (int)spell.MaxRange);
            WoWUnit mob = (from a in FTWProps.adds
                           where a.HealthPercent < 25
                           where a.InLineOfSight
                           //where (a.IsCasting == true || a.IsChanneling == true)
                           where a.Distance < range
                           //where a.CanInterruptCurrentSpellCast == true
                           orderby a.Distance descending
                           select a).FirstOrDefault();
            if (mob == null)
            {
                MyTimer.Stop(fnname);
                return false;
            }
            if (FTWUtils.MovementDisabled())
                FTWLogger.log(Color.Violet, "MOVEMENT DISABLED - Not facing target on execute!");
            else
                FTWCoreMovement.Face(mob);
            bool retval = On_Cast(firstpart, spellname, mob, true, false);
            if (retval)
            {

                FTWLogger.log(Color.GreenYellow, "    Executed on {0} with {1} dist {2:0.0} ", mob.SafeName(), spellname, mob.Distance);
            }
            MyTimer.Stop(fnname);
            return retval;
        }

        public static bool On_PullMore(string firstpart, string spellname)
        {
            // Pulls another mob with the specified spell.
            if (!(BotPoi.Current.Type == PoiType.Kill || BotPoi.Current.Type == PoiType.None))
                return false;
            if (FTWUtils.MovementDisabled())
                return false;
            if (StyxWoW.Me.HealthPercent < 80)
                return false;
            int range = 5;
            WoWSpell spell = null;
            try
            {
                if (FTWProps.fakecooldowns.ContainsKey(spellname))
                    spell = WoWSpell.FromId(FTWProps.fakecooldowns[spellname].SpellID);
                else
                    spell = SpellManager.Spells[spellname];
            }
            catch (KeyNotFoundException ex) { }
            if (spell == null || spell.CooldownTimeLeft.TotalMilliseconds > 0)
                return false;
            range = Math.Max(range, (int)spell.MaxRange);
            WoWUnit anothermob = (from u in ObjectManager.GetObjectsOfType<WoWUnit>(false, false)
                                  where u.IsValidUnit()
                                  where !u.TaggedByOther
                                  where !u.IsDead
                                  where !u.TaggedByOther
                                  where u.IsHostile
                                  where u.DistanceCalc() <= 40
                                  where !u.Mounted
                                  where u.InLineOfSight
                                  where u.Distance < range
                                  orderby u.Distance descending
                                  select u).FirstOrDefault();
            if (anothermob == null)
                return false;
            if (FTWUtils.MovementDisabled())
                FTWLogger.log(Color.Violet, "MOVEMENT DISABLED - Not facing target on pullmore!");
            else
                FTWCoreMovement.Face(anothermob);
            bool retval = On_Cast(firstpart, spellname, anothermob, true, false);
            if (retval)
                FTWLogger.log(Color.GreenYellow, "    Taunted {0} {1} dist {2:0.0} with {3} (addscount {4})", anothermob.SafeName(), anothermob.ShortGuid(), anothermob.Distance, spellname, FTWProps.adds.Count);
            return retval;
        }

        public static bool On_Paralyze(string firstpart, string spellname)
        {
            // Paralyzes the spellcaster furthest away from you
            // Similar to On_Interrupt, except doesn't check for interruptability
            // and prioritizes mobs attacking the healer over others.
            int range = 5;
            WoWSpell spell = null;
            try
            {
                if (FTWProps.fakecooldowns.ContainsKey(spellname))
                    spell = WoWSpell.FromId(FTWProps.fakecooldowns[spellname].SpellID);
                else
                    spell = SpellManager.Spells[spellname];
            }
            catch (KeyNotFoundException ex) { }
            if (spell == null || spell.CooldownTimeLeft.TotalMilliseconds > 0)
                return false;
            range = Math.Max(range, (int)spell.MaxRange);
            WoWUnit castingmob = (from a in FTWProps.adds
                                  where a.HealthPercent > 30
                                  where a.InLineOfSight
                                  where a.IsCasting == true ||
                                  a.IsChanneling == true ||
                                  a.IsAttackingHealer() == true
                                  where a.Distance < range
                                  orderby a.IsAttackingHealer() descending, a.Distance descending
                                  select a).FirstOrDefault();
            if (castingmob == null)
                return false;
            if (FTWUtils.MovementDisabled())
                FTWLogger.log(Color.Violet, "MOVEMENT DISABLED - Not facing target on paralyze!");
            else
                FTWCoreMovement.Face(castingmob);

            bool retval = On_Cast(firstpart, spellname, castingmob, true, false);
            if (retval)
                FTWLogger.log(Color.GreenYellow, "    Paralyzed {0} with {1} dist {2:0.0} attackinghealer {3}", castingmob.SafeName(), spellname, castingmob.Distance, castingmob.IsAttackingHealer());
            return retval;
        }

        public static bool On_CastAll(string firstpart, string auraname)
        {
            bool retval = false;
            string fnname = "FTWCore.On_CastAll";
            MyTimer.Start(fnname);
            WoWUnit mobwithoutaura = (from a in FTWProps.adds
                                      where a.HealthPercent > 30
                                      where a.InLineOfSight
                                      where a.Distance < 40
                                      where a.HasMyAura(auraname) == false
                                      select a).FirstOrDefault();

            if (mobwithoutaura != null)
            {
                if (FTWUtils.MovementDisabled())
                    FTWLogger.log(Color.Violet, "MOVEMENT DISABLED - Not facing target in CastAll");
                else
                    FTWCoreMovement.Face(mobwithoutaura);
                retval = On_Cast(firstpart, auraname, mobwithoutaura, false, false);
            }

            MyTimer.Stop(fnname);
            return retval;
        }

        public static bool On_AutoAttack()
        {
            string fnname = "FTWCore.On_AutoAttack";
            MyTimer.Start(fnname);
            if (!StyxWoW.Me.IsAutoAttacking && StyxWoW.Me.CurrentTarget != null)
            {
                FTWLogger.log("    AutoAttack");
                Lua.DoString("StartAttack()");
            }
            MyTimer.Stop(fnname);
            return false;
        }

        public static bool On_FindBetterTarget(string reason)
        {
            string fnname = "FTWCore.On_FindBetterTarget";
            MyTimer.Start(fnname);
            if (FTWUtils.MovementDisabled())
            {
                FTWLogger.log(Color.Violet, "MOVEMENT DISABLED, not looking for better target");
                MyTimer.Stop(fnname);
                return false;
            }
            WoWUnit target = StyxWoW.Me.CurrentTarget;
            if (target != null && target.IsValidUnit() && !target.IsDead && !target.IsCrowdControlled() && FTWCoreStatus.OnCooldown("FindBetterTarget"))
            {
                MyTimer.Stop(fnname);
                return false;
            }

            bool retval = ListAndTakeNewTarget(FTWProps.adds);
            if (retval == true)
                FTWCoreStatus.SaveCooldown("FindBetterTarget");
            MyTimer.Stop(fnname);
            return retval;
        }

        public static bool On_GrabAggro()
        {
            string fnname = "FTWCore.On_GrabAggro";
            MyTimer.Start(fnname);
            if (FTWUtils.MovementDisabled())
            {
                FTWLogger.log(Color.Violet, "MOVEMENT DISABLED - Not grabbing aggro.");
                MyTimer.Stop(fnname);
                return false;
            }
            WoWUnit target = StyxWoW.Me.CurrentTarget;
            if (target != null && target.IsValidUnit() && FTWCoreStatus.OnCooldown("GrabAggro"))
            {
                MyTimer.Stop(fnname);
                return false;
            }

            List<WoWUnit> units =
                (from u in FTWProps.adds
                 where u.Combat && u.IsValidUnit()
                 orderby
                         u.TargetWeight() descending,
                         u.IsCrowdControlled() ascending,
                         u.IsAttackingHealer() descending,
                         (int)u.ThreatInfo.ThreatStatus < 4 descending,
                         u.Guid == StyxWoW.Me.CurrentTargetGuid descending,
                         u.Guid == FTWProps.tank.CurrentTargetGuid descending,
                         u.Distance < 5 descending,
                         u.DistanceSqr ascending
                 select u).ToList();

            bool retval = ListAndTakeNewTarget(units);
            if (retval == true)
                FTWCoreStatus.SaveCooldown("GrabAggro");
            MyTimer.Stop(fnname);
            return retval;

        }

        public static bool ListAndTakeNewTarget(List<WoWUnit> units)
        {
            string fnname = "FTWCore.ListAndTakeNewTarget";
            MyTimer.Start(fnname);
            if (units == null || units.Count == 0)
            {
                MyTimer.Stop(fnname);
                return false;
            }

            WoWUnit newtarget = units[0];
            // Leave early if the first unit is the same as the current target
            if (newtarget.Guid == StyxWoW.Me.CurrentTargetGuid)
            {
                MyTimer.Stop(fnname);
                return false;
            }
            FTWLogger.log(Color.Violet, "Retargeting during combat - taking the first target from the list below.");
            foreach (WoWUnit unit in units)
            {
                string tag2 = "";
                if (unit.Guid == newtarget.Guid)
                    tag2 += "+";
                if (unit.Guid == StyxWoW.Me.CurrentTargetGuid)
                    tag2 += "-";
                if (unit.Guid == FTWProps.tank.CurrentTargetGuid)
                    tag2 += "t";
                tag2 = (tag2 + "  ").Substring(0, 2);
                FTWLogger.log(Color.Violet, "    {0} {1,-24} cc={2} atkhlr={3} wgt={4} thr={5} tank={6} inrange={7} dist={8:0.0} atk={9} {10} {11:0}",
                    tag2,
                    unit.SafeName(),
                    unit.IsCrowdControlled() ? 1 : 0,
                    unit.IsAttackingHealer() ? 1 : 0,
                    unit.TargetWeight(),
                    (int)unit.ThreatInfo.ThreatStatus,
                    unit.Guid == FTWProps.tank.CurrentTargetGuid ? 1 : 0,
                    unit.Distance < 5 ? 1 : 0,
                    unit.DistanceCalc(),
                    unit.CurrentTarget != null && unit.CurrentTarget.IsPlayer ? "?" : "",
                    unit.CurrentTarget != null ? unit.CurrentTarget.SafeName() : "",
                    unit.CurrentTarget != null ? unit.CurrentTarget.HealthPercent : 0);
            }
            newtarget.Target();
            FTWCoreMovement.Face(newtarget);

            MyTimer.Stop(fnname);
            return true;

        }

        public static bool On_UnimplementedAction(string action)
        {
            FTWLogger.log("Unimplemented action '{0}'", action);
            return false;
        }

        public static bool Macro(string macrotext)
        {
            double cooldown = 0;
            int c = macrotext.IndexOf(' ');
            if (c >= 0)
            {
                string s = macrotext.Substring(0, c);
                if (Double.TryParse(s, out cooldown))
                    macrotext = macrotext.Substring(c + 1);
            }
            if (FTWCoreStatus.OnCooldown(macrotext, cooldown, false))
                return false;
            FTWLogger.debug("    Macro: {0}", macrotext);
            Lua.DoString(string.Format("RunMacroText(\"{0}\");", macrotext));
            FTWCoreStatus.SaveCooldown(macrotext);
            return false;
        }
    }
}
