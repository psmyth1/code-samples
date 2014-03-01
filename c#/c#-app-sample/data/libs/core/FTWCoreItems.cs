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
    static class FTWCoreItems
    {
        public static bool ImbueWeapon(String spellname, string slotname, int slotid)
        {
            bool retval;
            FTWLogger.log(Color.YellowGreen, "ImbueWeapon {0} {1} {2}", spellname, slotname, slotid);
            if (!SpellManager.HasSpell(spellname))
            {
                FTWLogger.log(Color.YellowGreen, "Don't have spell");
                retval = false;
            }
            else if (FTWCoreStatus.OnCooldown(spellname, true))
            {
                retval = false;
            }
            else
            {
                FTWLogger.log(Color.YellowGreen, "Imbuing {0} weapon with '{1}'", slotname, spellname);
                Lua.DoString(string.Format("CancelItemTempEnchantment({0})", slotid));
                Thread.Sleep(1000);
                FTWCoreActions.On_Cast(string.Format("Me.ImbueWeapon{0}", slotid), spellname, StyxWoW.Me, false, false);
                Thread.Sleep(1000);
                FTWCoreStatus.SaveCooldown(spellname);
                retval = true;
            }
            return retval;
        }

        public static string WeaponEnchant(int slotid)
        {
            string retval = string.Empty;
            WoWItem weapon;
            if (slotid == 1)
                weapon = StyxWoW.Me.Inventory.Equipped.MainHand;
            else
                weapon = StyxWoW.Me.Inventory.Equipped.OffHand;

            if (weapon != null && weapon.TemporaryEnchantment.Id > 0)
                retval = weapon.TemporaryEnchantment.Name;
            //debug("Weapon {0} enchantment = '{1}'", slotid, retval);
            return retval;

        }

        public static bool On_Eat()
        {
            string fnname = "FTWCore.On_Eat";
            MyTimer.Start(fnname);
            bool retval;
            if (BotPoi.Current.Type != PoiType.None)
                return false;

            if (StyxWoW.Me.HasAura("Food"))
            {
                retval = true;
            }
            else if (FTWCoreStatus.OnCooldown("On_Eat"))
            {
                retval = false;
            }
            else if (FTWUtils.MovementDisabled())
            {
                retval = false;
            }
            else if (StyxWoW.Me.Mounted)
            {
                retval = false;
            }
            else
            {
                WoWItem eat = Consumable.GetBestFood(false);
                if (eat == null)
                {
                    retval = false;
                }
                else
                {
                    Navigator.PlayerMover.MoveStop();
                    Styx.CommonBot.Rest.FeedImmediate();
                    DateTime stoptime = DateTime.Now.AddSeconds(10);
                    while (DateTime.Now < stoptime)
                    {
                        if (StyxWoW.Me.HasAura("Food"))
                            break;
                        Thread.Sleep(100);

                    }
                    FTWCoreStatus.SaveCooldown("On_Eat");
                    retval = true;
                }
            }
            MyTimer.Stop(fnname);
            return retval;
        }

        public static bool On_Drink()
        {
            bool retval;
            if (BotPoi.Current.Type != PoiType.None)
                return false;
            string fnname = "FTWCore.On_Drink";
            MyTimer.Start(fnname);
            if (StyxWoW.Me.HasAura("Drink"))
            {
                retval = true;
            }
            else if (FTWCoreStatus.OnCooldown("On_Drink"))
            {
                retval = false;
            }
            else if (FTWUtils.MovementDisabled())
            {
                retval = false;
            }
            else if (StyxWoW.Me.Mounted)
            {
                retval = false;
            }
            else
            {
                WoWItem drink = Consumable.GetBestDrink(false);
                if (drink == null)
                {
                    retval = false;
                }
                else
                {
                    Navigator.PlayerMover.MoveStop();
                    Styx.CommonBot.Rest.DrinkImmediate();
                    DateTime stoptime = DateTime.Now.AddSeconds(10);
                    while (DateTime.Now < stoptime)
                    {
                        if (StyxWoW.Me.HasAura("Drink"))
                            break;
                        Thread.Sleep(100);

                    }
                    FTWCoreStatus.SaveCooldown("On_Drink");
                    retval = true;
                }
            }
            MyTimer.Stop(fnname);
            return retval;
        }

        public static bool On_UseHealthPotion()
        {
            return On_UsePotion(FTWProps.healthspellnames);
        }

        public static bool On_UseManaPotion()
        {
            return On_UsePotion(FTWProps.manaspellnames);
        }

        public static bool On_UsePotion(HashSet<String> spellnames)
        {
            bool retval = true;
            string fnname = "FTWCore.On_UsePotion";
            MyTimer.Start(fnname);
            using (StyxWoW.Memory.AcquireFrame())
            {
                if (!FTWUtils.ValidState())
                {
                    retval = false;
                }
                else
                {
                    WoWItem potion = (from i in StyxWoW.Me.CarriedItems
                                      let spells = i.ItemSpells
                                      where i.ItemInfo != null && spells != null && spells.Count != 0 &&
                                            i.Usable && i.Cooldown == 0 && i.ItemInfo.RequiredLevel <= StyxWoW.Me.Level &&
                                            spells.Any(s => s.IsValid && s.ActualSpell != null && spellnames.Contains(s.ActualSpell.Name))
                                      orderby i.ItemInfo.Level descending
                                      select i).FirstOrDefault();
                    if (FTWProps.debugitems.Count > 0)
                    {
                        foreach (WoWItem item in StyxWoW.Me.CarriedItems)
                        {
                            if (FTWProps.debugitems.Contains(item.Name))
                            {
                                List<WoWItem.WoWItemSpell> spells = item.ItemSpells;
                                ItemInfo inf = item.ItemInfo;
                                FTWLogger.debug(string.Format("{0} {1} {2}", item.Name, item.Usable, item.Cooldown));
                                if (spells != null)
                                {
                                    foreach (WoWItem.WoWItemSpell itemspell in spells)
                                    {
                                        FTWLogger.debug(string.Format("    {0} {1}", itemspell.Id, itemspell.ToString()));
                                        WoWSpell actualspell = itemspell.ActualSpell;
                                        if (actualspell != null)
                                        {
                                            FTWLogger.debug(string.Format("        {0} {1} {2}", actualspell.Id, actualspell.Name, actualspell.IsValid));
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (potion == null)
                    {
                        retval = false;
                    }
                    else
                    {
                        potion.UseContainerItem();
                        FTWLogger.log(Color.SkyBlue, "Using {0}", potion.Name);
                        retval = true;
                    }
                }
            }
            MyTimer.Stop(fnname);
            return retval;
        }

        public static bool On_UseBandage()
        {
            bool retval = true;
            if (!(BotPoi.Current.Type == PoiType.None || BotPoi.Current.Type == PoiType.Kill))
                return false;

            string fnname = "FTWCore.On_UseBandge";
            if (StyxWoW.Me.HasAura("Recently Bandaged"))
                return false;
            MyTimer.Start(fnname);
            using (StyxWoW.Memory.AcquireFrame())
            {
                if (!FTWUtils.ValidState())
                {
                    retval = false;
                }
                else if (FTWUtils.MovementDisabled())
                {
                    retval = false;
                }
                else if (StyxWoW.Me.Mounted)
                {
                    retval = false;
                }
                else
                {
                    WoWItem potion = (from i in StyxWoW.Me.CarriedItems
                                      let spells = i.ItemSpells
                                      where i.GetItemName().Contains("Bandage")
                                      where i.ItemInfo != null && i.ItemInfo.RequiredLevel <= StyxWoW.Me.Level
                                      orderby i.ItemInfo.Level descending
                                      select i).FirstOrDefault();

                    if (potion == null)
                    {
                        retval = false;
                    }
                    else
                    {
                        potion.UseContainerItem();
                        retval = true;
                    }
                }
            }
            MyTimer.Stop(fnname);
            return retval;
        }

        public static bool On_Use(string itemname, WoWUnit target)
        {
            string fnname = "FTWCore.On_Use";
            MyTimer.Start(fnname);
            bool retval = false;
            using (StyxWoW.Memory.AcquireFrame())
            {
                if (itemname.ToLower() == "trinket1" && StyxWoW.Me.Inventory.Equipped.Trinket1 != null)
                {
                    WoWItem trinket = StyxWoW.Me.Inventory.Equipped.Trinket1;
                    if (trinket.Cooldown == 0 && trinket.Usable == true && trinket.TriggersSpell == true)
                    {
                        FTWLogger.log("Using trinket {0}", StyxWoW.Me.Inventory.Equipped.Trinket1.Name);
                        StyxWoW.Me.Inventory.Equipped.Trinket1.Use();
                    }
                }
                else if (itemname.ToLower() == "trinket2" && StyxWoW.Me.Inventory.Equipped.Trinket2 != null)
                {
                    WoWItem trinket = StyxWoW.Me.Inventory.Equipped.Trinket2;
                    if (trinket.Cooldown == 0 && trinket.Usable == true && trinket.TriggersSpell == true)
                    {
                        FTWLogger.log("Using trinket {0}", StyxWoW.Me.Inventory.Equipped.Trinket2.Name);
                        StyxWoW.Me.Inventory.Equipped.Trinket2.Use();
                    }
                }
                else
                {
                    WoWItem item = GetInventoryItem(itemname);
                    if (item == null)
                    {
                        FTWLogger.debug("Couldn't find item {0}", itemname);
                    }
                    else if (item.Usable == false)
                    {
                        FTWLogger.debug("Item {0} is not usable", item.Name);
                    }
                    else if (item.Cooldown > 0)
                    {
                        FTWLogger.debug("Item {0} is on cooldown. Time remaining: {1}", item.Name, item.CooldownTimeLeft.TotalSeconds);
                    }
                    else if (FTWCoreStatus.OnCooldown(item.Name))
                    {
                        FTWLogger.debug("Item {0} is on cooldown.", item.Name);
                    }
                    else
                    {
                        if (target != null && target.Guid != StyxWoW.Me.Guid)
                        {
                            target.Target();
                            Thread.Sleep(100);
                        }
                        FTWLogger.log("Using item '{0}'", item.Name);
                        item.Use();
                        retval = false;
                    }
                }
            }
            MyTimer.Stop(fnname);
            return retval;
        }

        public static bool ItemOnCooldown(string itemname)
        {
            bool retval = false;
            string fnname = "FTWCore.ItemOnCooldown";
            MyTimer.Start(fnname);
            using (StyxWoW.Memory.AcquireFrame())
            {
                WoWItem item = StyxWoW.Me.CarriedItems.FirstOrDefault(i => i != null && i.Name == itemname);
                if (item == null)
                {
                    FTWLogger.debug("Don't have {0}", itemname);
                    retval = true;
                }
                else
                {
                    int cnt = Convert.ToInt32(Lua.GetReturnValues(String.Format("return GetItemCount(\"{0}\")", item.Name), "HasItem.lua")[0]);
                    if (cnt == 0)
                    {
                        FTWLogger.debug("Have 0 of {0}", item.Name);
                        retval = true;
                    }
                    else if (item.Cooldown > 0)
                    {
                        FTWLogger.debug("Item {0} on cooldown. Time left: {1}", item.Name, item.Cooldown);
                        retval = true;
                    }
                }
            }
            MyTimer.Stop(fnname);
            return retval;
        }

        public static WoWItem GetInventoryItem(string origname)
        {
            string fnname = "FTWCore.GetInventoryItem";
            MyTimer.Start(fnname);
            string name = origname.ToLower();
            foreach (WoWItem item in StyxWoW.Me.CarriedItems)
            {
                if (item != null && item.Name.ToLower() == name)
                {
                    MyTimer.Stop(fnname);
                    return item;
                }
            }
            FTWLogger.debug("  Didn't find {0}", name);
            MyTimer.Stop(fnname);
            return null;
        }

        public static int NumItems(string itemname)
        {
            int cnt = 0;
            string fnname = "FTWCore.NumItems";
            MyTimer.Start(fnname);
            using (StyxWoW.Memory.AcquireFrame())
            {
                WoWItem item = StyxWoW.Me.CarriedItems.FirstOrDefault(i => i != null && i.Name == itemname);
                if (item != null)
                    cnt = Convert.ToInt32(Lua.GetReturnValues(String.Format("return GetItemCount(\"{0}\")", item.Name), "NumItems.lua")[0]);
            }
            MyTimer.Stop(fnname);
            return cnt;
        }
    }
}
