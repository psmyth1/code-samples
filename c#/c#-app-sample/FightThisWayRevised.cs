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
using FTWRev.data.libs.ui;
using FTWRev.data.libs.core;
using FTWRev.data.libs.util;

namespace FTWRev
{
    public class FightThisWayRevised : CombatRoutine
    {
        public override sealed string Name { get { return "FightThisWayRevised v1.0 by Patrick Smyth"; } }
        public override bool WantButton { get { return true; } }
        public override WoWClass Class { get { return StyxWoW.Me.Class; } }
       
        static FTWConfig Form = new FTWConfig();
                
        public override void Initialize()
        {
            FTWProps.LoadProps();
                        
            SetRuleFileWatchers();
            
            DungeonWatcher.Initialize();
        }

        private void SetRuleFileWatchers()
        {
            // Watch for changes to the rules
            FileSystemWatcher fsm = new FileSystemWatcher(FTWProps.data_path);
            fsm.NotifyFilter = NotifyFilters.LastAccess | NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.DirectoryName;
            fsm.Filter = "*.txt";
            fsm.Changed += new FileSystemEventHandler(OnChanged);
            fsm.Created += new FileSystemEventHandler(OnChanged);
            fsm.Deleted += new FileSystemEventHandler(OnChanged);
            fsm.Renamed += new RenamedEventHandler(OnChanged);
            fsm.EnableRaisingEvents = true;
        }
                
        private void OnChanged(object source, FileSystemEventArgs e)
        {
            FTWProps.LoadProps();
        }

        public override void OnButtonPress()
        {
            new FTWConfig().ShowDialog();
        }

        public override void Pulse()
        {
            string fnname = "FTWRev.Pulse";
            MyTimer.Start(fnname);

            // Display startup message
            if (FTWProps.firstpulse == true)
            {
                FTWProps.firstpulse = false;
                // Eh, I don't like it. Uncomment if you really want it.
                //Mount.OnMountUp += UseTravelForm;
                FTWProps.core.Initialize();
                FTWLogger.log("FTW starting at {0}", DateTime.Now.ToString("MM/dd/yyyy hh:mm:ss"));
                FTWLogger.log("Current bot: {0}", Styx.CommonBot.BotManager.Current.Name);
            }

            // Unstick ourselves if necessary.
            CheckForStuck.Pulse();

            // Display last red text
            if (StyxWoW.LastRedErrorMessage != FTWProps.redtext)
            {
                FTWProps.redtext = StyxWoW.LastRedErrorMessage;
                FTWLogger.debug(Color.Red, "Red text: {0}", FTWProps.redtext);
            }

            // Leave early if not in valid state
            if (!FTWUtils.ValidState())
            {
                //FTWLogger.debug(Color.Red, "Invalid state: {0}", FTWUtils.printState());
            }
            else
            {
                // Save current class and spec
                //FTWProps.ClassAndSpec = StyxWoW.Me.ClassAndSpec();

                // List aura changes
                AuraWatcher.Pulse();

                // Load rules if they're not loaded
                //if (!FTWProps.rules.ContainsKey(FTWProps.ClassAndSpec))
                //    FTWProps.LoadRules();

                FTWProps.core.Pulse();

                if (FTWUtils.MeOrPartyMemberInCombat())
                {
                    //if (BotPoi.Current.Type == PoiType.Loot)
                    //{
                    //    debug("Not done with combat, clearing loot flag");
                    //    BotPoi.Clear();
                    //}
                    // Force combat because me OR party/raid members in combat)
                    Combat();
                }
            }

            // Perform dungeon stuff
            DungeonWatcher.Pulse();

            // Perform UI stuff
            UI.Pulse();

            MyTimer.Stop(fnname);
            MyTimer.Pulse();
        }

        public override void Combat()
        {
            string fnname = "FTWRev.Combat";
            MyTimer.Start(fnname);
            if (!FTWUtils.ValidState())
            {
                //FTWLogger.debug(Color.Red, "Invalid state: {0}", FTWUtils.printState());
            }
            else
            {
                CheckForChest.Clear();
                Evade.CheckCombat();
                FTWProps.core.EvaluateRules("@COMBAT");
            };
            MyTimer.Stop(fnname);
        }

        public override void Pull()
        {
            string fnname = "FTWRev.Pull";
            MyTimer.Start(fnname);
            if (!FTWUtils.ValidState())
            {
                //FTWLogger.debug(Color.Red, "Invalid state: {0}", FTWUtils.printState());
            }
            else
            {
                CheckForChest.Clear();
                if (Evade.CheckPull())
                    FTWProps.core.EvaluateRules("@PULL");
            }
            MyTimer.Stop(fnname);
        }

        public override bool NeedRest
        {
            // Most of the code to be executed is in the text file, in the 'Rest' section.
            // That code is executed in the 'EvaluateRules' call below.
            get
            {
                string fnname = "FTWRev.NeedRest";
                MyTimer.Start(fnname);
                if (!FTWUtils.ValidState())
                {
                    //FTWLogger.debug(Color.Red, "Invalid state: {0}", FTWUtils.printState());
                }
                else
                {
                    if (CharacterSettings.Instance.LootChests)
                        CheckForChest.Pulse();

                    if (DateTime.Now >= FTWProps.nextrest)
                    {
                        FTWProps.nextrest = DateTime.Now.AddSeconds(3);

                        bool didsomething = FTWProps.core.EvaluateRules("@REST");

                        // Wait for eating or drinking to finish.
                        while (StyxWoW.Me.EatingOrDrinking())
                        {
                            Thread.Sleep(10);
                            if ((StyxWoW.Me.HealthPercent > 98 && StyxWoW.Me.ManaPercent > 98) || StyxWoW.Me.Combat || StyxWoW.Me.PetInCombat || FTWCoreUnits.GetAdds().Count > 0)
                                break;
                        }
                        while (StyxWoW.Me.IsCasting)
                        {
                            int spellid = (int)StyxWoW.Me.CurrentCastId;
                            if (spellid == 0)
                                return false;
                            Thread.Sleep(10);
                        }
                        if (didsomething)
                        {
                            while (StyxWoW.Me.IsChanneling)
                                Thread.Sleep(10);
                        }
                    }
                }
                MyTimer.Stop(fnname);
                return false;
            }
        }
    }    
}