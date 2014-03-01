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
    static class FTWCoreStatus
    {
        public static List<String[]> ListMyAuras()
        {
            return ListAuras(StyxWoW.Me);
        }

        public static List<String[]> ListTargetAuras()
        {
            return ListAuras(StyxWoW.Me.CurrentTarget);
        }

        public static List<String[]> ListAuras(WoWUnit target)
        {
            List<String[]> lst = new List<String[]>();
            if (target == null)
                return lst;
            List<String> keys = target.Auras.Keys.ToList();
            keys.Sort();
            foreach (String key in keys)
            {
                WoWAura aura = target.Auras[key];
                String[] arr = { "", "", "" };
                arr[0] = aura.Name;
                arr[1] = (aura.StackCount == 0 ? "" : aura.StackCount.ToString());
                arr[2] = (aura.TimeLeft.TotalSeconds == 0 ? "" : string.Format("{0:0.00}", aura.TimeLeft.TotalSeconds));
                lst.Add(arr);
            }
            return lst;
        }

        public static List<String[]> ListCooldowns()
        {
            WoWSpell spell = null;
            List<String> keys = FTWProps.spellWasLastCast.Keys.ToList();
            keys.Sort();

            List<String[]> cooldowns = new List<String[]>();
            foreach (String key in keys)
            {
                String[] arr = new String[4];
                arr[0] = key;
                FakeCooldown fc = null;
                if (FTWProps.fakecooldowns.ContainsKey(key))
                {
                    fc = FTWProps.fakecooldowns[key];
                    arr[1] = fc.SpellID.ToString();
                }
                else
                {
                    spell = SpellManager.Spells[key];
                    arr[1] = spell.Id.ToString();
                }
                arr[2] = string.Format("{0:hhmmss}", FTWProps.spellWasLastCast[key]);
                double cooldownremaining = 0;
                if (fc != null)
                    cooldownremaining = FTWProps.spellWasLastCast[key].AddSeconds(fc.Cooldown).Subtract(DateTime.Now).TotalSeconds;
                else
                    cooldownremaining = spell.CooldownTimeLeft.TotalSeconds;
                arr[3] = (cooldownremaining <= 0 ? "" : string.Format("{0:0.00}", cooldownremaining));
                cooldowns.Add(arr);
            }
            return cooldowns;
        }

        public static bool OnCooldown(string spellname, double seconds, bool debugspell)
        {
            bool retval = false;
            string fnname = "FTWCore.OnCooldown";
            MyTimer.Start(fnname);
            Color ds = Color.Magenta;
            WoWSpell spell = null;
            bool WoWCooldown = false;
            bool FTWCooldown = false;
            bool RecentCooldown = false;
            bool ElapsedCooldown = false;
            double elapsedtime = -1;
            String errmsg = "";

            // Get the spell
            if (FTWProps.fakecooldowns.ContainsKey(spellname))
                spell = WoWSpell.FromId(FTWProps.fakecooldowns[spellname].SpellID);
            else if (SpellManager.Spells.ContainsKey(spellname))
                spell = SpellManager.Spells[spellname];
            else
                spell = null;

            // Get the elapsed time since the last cast.
            if (FTWProps.spellWasLastCast.ContainsKey(spellname))
                elapsedtime = (DateTime.Now - FTWProps.spellWasLastCast[spellname]).Seconds;

            // Check if it's on WoW cooldown
            //if (spell != null)
            //{
            //    if (spell.Cooldown)
            //    {
            //        WoWCooldown = spell.Cooldown;
            //    }
            //else
            //{
            //    // Do a harder check - make sure it's been at least BaseCooldown milliseconds since last cast
            //    // This avoids problems with spells that don't actually cast when you think they do, and eat the rotation.
            //    WoWCooldown = (elapsedtime * 1000) < spell.BaseCooldown;
            //    if (WoWCooldown)
            //        log("Elapsedtime {0} * 1000 < spell.BaseCooldown {1}", elapsedtime, spell.BaseCooldown);
            //}
            //}

            // Check if it's on recent cooldown
            uint cd = 1500;
            if (spell != null)
                cd = Math.Min(spell.CastTime, 1500);
            RecentCooldown = ((FTWProps.lastspellcastname == spellname) && (DateTime.Now - FTWProps.lastspellcasttime).TotalMilliseconds < cd);

            // Check if it's on FTW cooldown
            if (FTWProps.fakecooldowns.ContainsKey(spellname))
                FTWCooldown = elapsedtime >= 0 && elapsedtime < FTWProps.fakecooldowns[spellname].Cooldown;
            else if (spell != null)
                WoWCooldown = spell.Cooldown;

            // Check if it's on elapsed time cooldown
            ElapsedCooldown = elapsedtime < seconds;

            if (WoWCooldown)
                errmsg = "WoW";
            else if (RecentCooldown)
                errmsg = "double-cast";
            else if (FTWCooldown)
                errmsg = "FTW";
            else if (RecentCooldown)
                errmsg = "Elapsed time";

            if (errmsg != "")
            {
                if (debugspell) FTWLogger.log(ds, "... {0} on {1} cooldown", spellname, errmsg);
                retval = true;
            }

            MyTimer.Stop(fnname);
            return retval;
        }

        public static void SaveCooldown(string spellname)
        {
            // Note the last time the spell was cast or action was taken, for the 'fake cooldowns.'
            DateTime dt = DateTime.Now;
            if (FTWProps.spellWasLastCast.ContainsKey(spellname))
                FTWProps.spellWasLastCast.Remove(spellname);
            FTWProps.spellWasLastCast[spellname] = dt;
            FTWProps.lastspellcastname = spellname;
            FTWProps.lastspellcasttime = dt;
        }

        public static bool OnCooldown(string spellname)
        {
            return OnCooldown(spellname, 0, false);
        }

        public static bool OnCooldown(string spellname, bool debugspell)
        {
            return OnCooldown(spellname, 0, debugspell);
        }

        public static bool OnPetCooldown(string spellname)
        {
            string fnname = "FTWCore.OnPetCooldown";
            MyTimer.Start(fnname);
            bool retval = false;
            WoWPetSpell spell = null;
            foreach (WoWPetSpell sp in StyxWoW.Me.PetSpells)
            {
                if (sp.Spell != null && sp.Spell.Name == spellname)
                {
                    spell = sp;
                    break;
                }
            }
            if (spell == null)
            {
                retval = false;
            }
            else if (spell.Cooldown)
            {
                retval = true;
            }
            else if (!FTWProps.spellWasLastCast.ContainsKey(spellname))
            {
                retval = false;
            }
            else
            {
                int elapsedtime = (DateTime.Now - FTWProps.spellWasLastCast[spellname]).Seconds;
                if (FTWProps.fakePetCooldownTimes.ContainsKey(spellname) &&
                   (elapsedtime < FTWProps.fakePetCooldownTimes[spellname]))
                    retval = true;
            }
            MyTimer.Stop(fnname);
            return retval;
        }

        public static bool On_DumpAuras(WoWUnit target)
        {
            FTWLogger.debug(Color.PaleVioletRed, "DUMPAURAS: {0} auras:", target.SafeName());
            foreach (WoWAura aura in target.Auras.Values)
                FTWLogger.debug(Color.PaleVioletRed, "    {0} {1} {2} ms", aura.Name, aura.StackCount, aura.TimeLeft.TotalMilliseconds);
            return false;
        }

        public static bool On_DumpParty()
        {
            FTWLogger.debug(Color.Yellow, "{0} close party members:", FTWProps.closePeople.Count);
            foreach (WoWPlayer p in FTWProps.closePeople)
                FTWLogger.debug(Color.Yellow, "    {0,-16} {1:00.0} {2:000.0}% ({3:000000} total health)", p.SafeName(), p.Distance, p.HealthPercent, p.MaxHealth);
            FTWLogger.debug(Color.Yellow, "Tank is {0}", FTWProps.tank == null ? "<none>" : FTWProps.tank.SafeName());
            FTWLogger.debug(Color.Yellow, "Healer is {0}", FTWProps.healer == null ? "<none>" : FTWProps.healer.SafeName());
            return false;
        }

        public static int StunCount(WoWPoint loc)
        {
            string fnname = "FTWCore.StunCount";
            MyTimer.Start(fnname);
            int cnt = (from u in FTWProps.adds
                       where u.IsCrowdControlled()
                       where u.Location.Distance(loc) < 8
                       select u).Count();
            MyTimer.Stop(fnname);
            return cnt;
        }

        public static bool HasTotem(String totemname)
        {
            foreach (WoWTotemInfo x in StyxWoW.Me.Totems)
            {
                if (x == null)
                    continue;
                if (x.WoWTotem == WoWTotem.None)
                    continue;
                if (x.Name == totemname)
                    return true;
            }
            return false;
        }

        public static int TotemCount()
        {
            int ctr = 0;
            foreach (WoWTotemInfo x in StyxWoW.Me.Totems)
            {
                if (x == null)
                    continue;
                if (x.WoWTotem == WoWTotem.None)
                    continue;
                ctr += 1;
            }
            return ctr;
        }
    }
}
