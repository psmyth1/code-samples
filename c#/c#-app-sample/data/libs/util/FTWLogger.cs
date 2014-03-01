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
    static class FTWLogger
    {
        private static Color _textcolor = Color.Aqua;
        private static string lastmessage = string.Empty;
        
        public static void log(string format, params object[] args)
        {
            log(_textcolor, format, args);
        }
        
        public static void log(Color color, string format, params object[] args)
        {
            string s2 = string.Format(format, args);
            if (s2 == lastmessage)
                return;
            lastmessage = s2;
            string s = string.Format("[FTW] {0:hh:mm:ss} ", DateTime.Now) + s2;
            Logging.Write(System.Windows.Media.Color.FromRgb(color.R, color.G, color.B), s);
        }

        public static void debug(string format, params object[] args)
        {
            debug(_textcolor, format, args);
        }

        public static void debug(Color color, string format, params object[] args)
        {
            string s = string.Format(string.Format("[FTW] {0:hh:mm:ss} ", DateTime.Now) + format, args);
            Logging.Write(LogLevel.Diagnostic, System.Windows.Media.Color.FromRgb(color.R, color.G, color.B), s);
        }
    }
}
