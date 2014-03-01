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
    public static class CheckForStuck
    {
        private static Random random = new Random();
        private static WoWPoint stuckPoint = WoWPoint.Empty;
        private static DateTime stuckNextTime = DateTime.Now;
        private static int stuckDistance = 5;
        private static int stuckCtr = 0;
        private static int stuckInterval = 120;
        private static DateTime antiafk = DateTime.Now;
        private static int antiafkinterval = 300000;

        public static void Pulse()
        {
            string fnname = "CheckForStuck.Pulse";

            if (!
                (StyxWoW.IsInGame &&
                StyxWoW.Me != null &&
                StyxWoW.Me.IsValid &&
                !StyxWoW.Me.IsDead &&
                !StyxWoW.Me.IsGhost &&
                !StyxWoW.Me.IsOnTransport &&
                !StyxWoW.Me.OnTaxi)
                )
                return;

            // Anti-AFK logic
            if (DateTime.Now > antiafk)
            {
                antiafk = DateTime.Now.AddMilliseconds(antiafkinterval + random.Next(3000, 5000));
                KeyboardManager.PressKey((Char)System.Windows.Forms.Keys.Right);
                Thread.Sleep(random.Next(10, 20));
                KeyboardManager.ReleaseKey((Char)System.Windows.Forms.Keys.Right);
            }

            if (!(",Gatherbuddy2,ArchaeologyBuddy,".Contains("," + Styx.CommonBot.BotManager.Current.Name + ",")))
                return;

            // Stuck logic
            MyTimer.Start(fnname);
            int numJumps;
            if (NotStuck() || DateTime.Now < stuckNextTime)
            {
                MyTimer.Stop(fnname);
                return;
            }

            stuckCtr += 1;
            FTWLogger.log(Color.Tomato, "Stuck for the {0} time - moving about a bit.", stuckCtr);

            // Just press the space bar first
            numJumps = random.Next(1, 3);
            for (int i = 0; i < numJumps; i++)
            {
                PressSpace();
                if (NotStuck())
                {
                    MyTimer.Stop(fnname);
                    return;
                }
            }

            // Back up
            numJumps = random.Next(1, 3);
            for (int i = 0; i < numJumps; i++)
            {
                WoWMovement.Move(WoWMovement.MovementDirection.Backwards);
                Thread.Sleep(random.Next(1000, 2000));
                WoWMovement.MoveStop();
                if (NotStuck())
                {
                    MyTimer.Stop(fnname);
                    return;
                }
            }

            // Long jumps
            numJumps = random.Next(2, 4);
            for (int i = 0; i < numJumps; i++)
            {
                KeyboardManager.PressKey((char)Keys.Space);
                Thread.Sleep(random.Next(2000, 3000));
                KeyboardManager.ReleaseKey((char)Keys.Space);
                Thread.Sleep(random.Next(250, 750));
                if (NotStuck())
                {
                    MyTimer.Stop(fnname);
                    return;
                }
            }


            // Up + space
            numJumps = random.Next(1, 3);
            for (int i = 0; i < numJumps; i++)
            {
                KeyboardManager.PressKey((char)Keys.Up);
                Thread.Sleep(random.Next(30, 50));
                KeyboardManager.PressKey((char)Keys.Space);
                Thread.Sleep(random.Next(500, 750));
                KeyboardManager.ReleaseKey((char)Keys.Up);
                KeyboardManager.ReleaseKey((char)Keys.Space);
                Thread.Sleep(random.Next(250, 750));
                if (NotStuck())
                {
                    MyTimer.Stop(fnname);
                    return;
                }
            }

            // Space + up
            numJumps = random.Next(1, 3);
            for (int i = 0; i < numJumps; i++)
            {
                KeyboardManager.PressKey((char)Keys.Space);
                Thread.Sleep(random.Next(30, 50));
                KeyboardManager.PressKey((char)Keys.Up);
                Thread.Sleep(random.Next(500, 750));
                KeyboardManager.ReleaseKey((char)Keys.Up);
                KeyboardManager.ReleaseKey((char)Keys.Space);
                Thread.Sleep(random.Next(250, 750));
                if (NotStuck())
                {
                    MyTimer.Stop(fnname);
                    return;
                }
            }
            MyTimer.Stop(fnname);
        }

        private static void PressSpace()
        {
            KeyboardManager.PressKey((char)Keys.Space);
            Thread.Sleep(random.Next(250, 500));
            KeyboardManager.ReleaseKey((char)Keys.Space);
            Thread.Sleep(random.Next(250, 750));
        }

        private static bool NotStuck()
        {
            if (StyxWoW.Me == null ||
                !StyxWoW.IsInGame ||
                !StyxWoW.Me.IsValid)
            {
                return true;
            }

            if (stuckPoint == WoWPoint.Empty || StyxWoW.Me.Location.Distance(stuckPoint) > stuckDistance)
            {
                stuckPoint = StyxWoW.Me.Location;
                stuckNextTime = DateTime.Now.AddSeconds(stuckInterval);
                return true;
            }

            return false;
        }
    }
}
