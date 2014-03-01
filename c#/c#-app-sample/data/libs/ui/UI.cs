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

namespace FTWRev.data.libs.ui
{
    public static class UI
    {
        private static DateTime nextUIupdate = DateTime.Now;
        public static int updateinterval = 100;
        public delegate void UpdateUIDelegate(EventArgs args);
        public static event UpdateUIDelegate UpdateUI;

        public static void Pulse()
        {
            if (DateTime.Now > nextUIupdate)
            {
                nextUIupdate = DateTime.Now.AddMilliseconds(updateinterval);
                if (UpdateUI != null)
                    UpdateUI(new EventArgs());
            }
        }
    }
}
