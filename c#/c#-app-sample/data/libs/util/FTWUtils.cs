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
    static class FTWUtils
    {
        public static string printState()
        {
            Dictionary<string, bool> cur_state = getCurrentState();
            string state_str = "";

            foreach (var st in cur_state)
            {
                state_str += String.Format("{0} is : {1} ", st.Key, st.Value);
            }

            return state_str;
        }

        public static Dictionary<string, bool> getCurrentState()
        {
            Dictionary<string, bool> state_index = new Dictionary<string, bool>();
            state_index.Add("IsInGame",StyxWoW.IsInGame);
            state_index.Add("IsValid", (StyxWoW.Me != null && StyxWoW.Me.IsValid && StyxWoW.IsInGame));
            state_index.Add("IsAlive", !StyxWoW.Me.IsDead);
            state_index.Add("IsDead", StyxWoW.Me.IsDead);
            state_index.Add("IsGhost", StyxWoW.Me.IsGhost);
            state_index.Add("IsMounted", StyxWoW.Me.Mounted);
            state_index.Add("IsTransported", (StyxWoW.Me.IsFlying || StyxWoW.Me.IsOnTransport || StyxWoW.Me.OnTaxi));
            state_index.Add("IsFlying", StyxWoW.Me.IsFlying);
            state_index.Add("IsOnTransport", StyxWoW.Me.IsOnTransport);
            state_index.Add("IsOnTaxi", StyxWoW.Me.OnTaxi);
            state_index.Add("IsInsideBattleground", Battlegrounds.IsInsideBattleground);

            return state_index;
        }

        public static bool ValidState()
        {
            Dictionary<string, bool> cur_state = getCurrentState();
            bool valid_state = false;

            if (cur_state["IsValid"] && !cur_state["IsDead"] && !cur_state["IsGhost"] && !cur_state["IsTransported"])
            {
                if (cur_state["IsMounted"])
                {
                    if (Battlegrounds.IsInsideBattleground)
                        valid_state = true;
                    else if (!Styx.Helpers.LevelbotSettings.Instance.GroundMountFarmingMode)
                        valid_state = true;
                }
                else
                    valid_state = true;
            }
            return valid_state;
        }

        public static void UseTravelForm(object sender, MountUpEventArgs e)
        {
            float traveldist = 30;
            float dist = StyxWoW.Me.Location.Distance(e.Destination);
            string errmsg = string.Empty;
            while (SpellManager.GlobalCooldown || StyxWoW.Me.IsCasting || StyxWoW.Me.ChanneledSpell != null)
                Thread.Sleep(10);
            if (!SpellManager.HasSpell("Travel Form"))
                errmsg = "Don't have travel form.";
            else if (e.Destination == WoWPoint.Zero)
                errmsg = "Destination is WoWPoint.Zero";
            else if (dist > traveldist)
                errmsg = string.Format("Dist {0} > traveldist {1}", dist, traveldist);
            else if (Battlegrounds.IsInsideBattleground && DateTime.Now < Battlegrounds.BattlefieldStartTime)
                errmsg = "Battle hasn't started yet.";
            if (errmsg != string.Empty)
            {
                FTWLogger.log("Not using travel form because {0}", errmsg);
            }
            else
            {
                e.Cancel = true;
                FTWLogger.log("Using travel form for point {0} yards away (MountDistance: {1})",
                    dist,
                    Styx.Helpers.CharacterSettings.Instance.MountDistance);
                if (!StyxWoW.Me.HasAura("Travel Form"))
                    SpellManager.Cast("Travel Form");
            }
        }

        public static bool MeOrPartyMemberInCombat()
        {
            if (FTWProps.adds.Count > 0 || StyxWoW.Me.Combat || StyxWoW.Me.PetInCombat)
                return true;
            else
                return false;
        }

        public static bool MovementDisabled()
        {
            if (FTWProps.UseScrollLock == false)
                return false;
            if (ScrollLockDown())
                return true;
            return false;
        }

        public static bool CapsLockDown()
        {
            return System.Windows.Forms.Control.IsKeyLocked(System.Windows.Forms.Keys.CapsLock);
        }

        public static bool ScrollLockDown()
        {
            return System.Windows.Forms.Control.IsKeyLocked(System.Windows.Forms.Keys.Scroll);
        }
    }
}
