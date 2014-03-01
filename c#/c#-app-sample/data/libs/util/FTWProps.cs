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

using FTWRev.data.libs.core;

namespace FTWRev.data.libs.util
{
    static class FTWProps
    {
        public static string ClassAndSpec = null;
        public static Dictionary<String, FakeCooldown> fakecooldowns = null;
        public static Dictionary<string, DateTime> spellWasLastCast = new Dictionary<string, DateTime>();

        public static string data_path;
        public static string rules_path;
        public static string class_rules_path;
        public static string gen_rules_path;

        public static DateTime nextrest = DateTime.Now;
        public static bool UseScrollLock = true;

        public static Dictionary<String, String> rules = new Dictionary<String, String>();
        public static FTWCore core;
        public static bool firstpulse = true;

        public static HashSet<String> AOESpells;
        public static HashSet<String> Stuns;
        public static HashSet<String> TankOnlySpells;
        public static HashSet<String> CastOver;
        public static HashSet<String> IgnoreMobsBattleground;
        public static HashSet<String> IgnoreCanCast;
        public static string[] PropertyNames;
        public static Dictionary<String, int> MobWeights;
        public static string redtext = "";

        public static string mode = string.Empty;
        public static Dictionary<ulong, Dictionary<String, double>> properties;
        public static Dictionary<string, int> fakePetCooldownTimes = new Dictionary<string, int>
                {
                    {"Leap", 10},
                    {"Gnaw", 10}
                };
        public static WoWUnit tank;
        public static WoWUnit healer;
        public static List<WoWPlayer> people = new List<WoWPlayer>();
        public static List<WoWPlayer> closePeople = new List<WoWPlayer>();
        public static WoWPlayer healTarget;
        public static WoWPlayer cleanseTarget;
        public static WoWPlayer reviveTarget;
        public static WoWUnit add;
        public static int avgHealth = 100;
        public static int _eclipsedirection = 1;
        public static string lastspellcastname = string.Empty;
        public static DateTime lastspellcasttime = DateTime.Now;
        public static Dictionary<string, DateTime> CastOnce = new Dictionary<string, DateTime>();
        public static int CastOnceTime = 120;
        public static List<WoWUnit> adds = new List<WoWUnit>();
        public static List<WoWUnit> nontargetadds = new List<WoWUnit>();
        public static HashSet<WoWDispelType> dispels = new HashSet<WoWDispelType>();
        public static int cliptime = 50;
        public static double range = 4.95;
        public static int not_in_los_attempts = 0;
        public static DateTime MovementCooldown = DateTime.Now;
        public static HashSet<String> manaspellnames = new HashSet<String> { "Restore Mana", "Water Spirit" };
        public static HashSet<String> healthspellnames = new HashSet<String> { "Healing Potion", "Healthstone" };
        public static HashSet<String> debugitems = new HashSet<String> { };

        static FTWProps()
        {
            data_path = Styx.CommonBot.Routines.RoutineManager.RoutineDirectory + "\\FTWRevised\\data";
            rules_path = data_path + "\\rules";
            class_rules_path = rules_path + "\\classes";
            gen_rules_path = rules_path + "\\general";

            if (!File.Exists(gen_rules_path + "\\Spell_Overrides.txt"))
            {
                string s = string.Format("Could not find path:\n\n{0}\n\nMake sure you have installed this software to the following path:\n\n    HonorBuddy\\Routines\\FTWRevised", data_path);
                MessageBox.Show(s, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                throw new Exception(s);
            }
        }

        public static void LoadProps()
        {   
            ClassAndSpec = StyxWoW.Me.ClassAndSpec();
            LoadRules();
            core = new FTWCore();
        }

        private static void LoadRules()
        {
            fakecooldowns = LoadFakeCooldowns(gen_rules_path + "\\Spell_Overrides.txt");
            AOESpells = LoadList(gen_rules_path + "\\Spell_Target_Circle.txt");
            Stuns = LoadList(gen_rules_path + "\\Spell_Stuns.txt");
            TankOnlySpells = LoadList(gen_rules_path + "\\Spell_Tank_Only.txt");
            CastOver = LoadList(gen_rules_path + "\\Spell_Cast_Over.txt");
            IgnoreMobsBattleground = LoadList(gen_rules_path + "\\Ignore_Mobs_Battleground.txt");
            PropertyNames = File.ReadAllLines(gen_rules_path + "\\Properties.txt");
            IgnoreCanCast = LoadList(gen_rules_path + "\\Spell_Ignore_CanCast.txt");
            MobWeights = LoadWeights(gen_rules_path + "\\Mob_Weights.txt");
            try
            {
                FTWLogger.log("Loading rules for {0}", ClassAndSpec);
                string filename = FTWProps.class_rules_path + "\\" + ClassAndSpec + ".txt";
                rules[ClassAndSpec] = File.ReadAllText(filename);
            }
            catch (Exception ex)
            {
                FTWLogger.log(Color.Red, "Couldn't find a data file for {0}! {1}", ClassAndSpec, ex.Message);
            }
        }

        private static Dictionary<String, FakeCooldown> LoadFakeCooldowns(String filename)
        {
            string[] readText = File.ReadAllLines(filename);
            Dictionary<String, FakeCooldown> lst = new Dictionary<String, FakeCooldown>();
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < readText.Length; i++)
            {
                string line = readText[i];
                if (line.StartsWith("//") || line.Length < 5)
                    continue;
                FakeCooldown fc = new FakeCooldown(line);
                sb.AppendLine(String.Format("    {0}\t{1}\t{2}", fc.SpellID, fc.Cooldown, fc.Name));
                if (lst.ContainsKey(fc.Name))
                    throw new Exception(string.Format("Spell {0} entered in {1} twice!", fc.Name, filename));
                lst.Add(fc.Name, fc);
            }
            return lst;
        }

        private static HashSet<String> LoadList(String filename)
        {
            HashSet<String> h = new HashSet<String>();
            string[] lines = File.ReadAllLines(filename);
            foreach (String line in lines)
            {
                String s = line.Trim();
                if (s.Length == 0 || s.StartsWith("//") || s.StartsWith("--"))
                    continue;
                if (h.Contains(s))
                    throw new Exception(string.Format("Line '{0}' entered in file '{1}' twice!", s, filename));
                h.Add(s);
            }
            return h;
        }

        private static Dictionary<String, int> LoadWeights(String filename)
        {
            Dictionary<String, int> h = new Dictionary<String, int>();
            string[] lines = File.ReadAllLines(filename);
            foreach (String line in lines)
            {
                String s = line.Trim();
                if (s.Length == 0 || s.StartsWith("//") || s.StartsWith("--"))
                    continue;
                String[] words = s.Split('\t');
                if (h.ContainsKey(words[1]))
                    throw new Exception(string.Format("Line '{0}' entered in file '{1}' twice!", s, filename));
                h[words[1]] = Int32.Parse(words[0]);
            }
            return h;
        }
    }
}
