Attribute VB_Name = "Module1"
Option Explicit
Sub FinalFormatting()
    Worksheets(1).Select
    Dim PageBreaks(), HCount, count, SRow, LRow, PRow As Integer
    
    LRow = LastRow()
    SRow = 2
    count = 0
    
    SRow = 5
    HCount = 0
    Do Until SRow = LRow
        If Cells(SRow, 2) = "Ratings" Then
            HCount = HCount + 1
        End If
        If Cells(SRow, 1) = "1Meridian Performance Partners, L.P. - A Limited Partnership Interests" Then
            Cells(SRow, 1) = "Meridian Performance Partners, L.P. - A"
        End If
        If Cells(SRow, 1) = "1Meridian Capital Fund, LLC - domestic, 1%/10%" Then
            Cells(SRow, 1) = "Meridian Capital Fund, LLC - 1%x10%"
        End If
        If Cells(SRow, 2) = "B Low Vol" Then
            Cells(SRow, 2) = "BLV"
            Columns(3).ColumnWidth = 4#
        End If
        If Cells(SRow, 2) = "None" Then
            Cells(SRow, 2).ClearContents
        End If
        If Cells(SRow, 3) = "None" Then
            Cells(SRow, 3).ClearContents
        End If
        SRow = SRow + 1
    Loop
    Columns(1).AutoFit
    ReDim PageBreaks(HCount)
    SRow = 5
    count = 0
    Cells(1, 49) = 0
    Do Until SRow = LRow
        If Cells(SRow, 2) = "Ratings" Then
            PageBreaks(count) = SRow - 1
            Cells(SRow - 2, 45).HorizontalAlignment = xlRight
            count = count + 1
            If Cells(SRow-1, 1) = "MCP Funds & Indices" Then
                Cells(1, 49) = SRow + 2
            End If
        End If
        SRow = SRow + 1
    Loop
    If Cells(1, 49) = 0 Then
        Cells(1, 49) = LRow
    End If
    Cells(LRow, 45).HorizontalAlignment = xlRight
    ActiveSheet.PageSetup.Orientation = xlLandscape
    ActiveWindow.View = xlPageBreakPreview
    PRow = LRow
    ActiveSheet.PageSetup.PrintArea = "A1:AV" & PRow
    If HCount = 4 Then
        Set ActiveSheet.HPageBreaks(1).Location = Cells(PageBreaks(0), 1)
        On Error Resume Next
        Set ActiveSheet.HPageBreaks(2).Location = Cells(PageBreaks(1), 1)
        On Error Resume Next
        Set ActiveSheet.HPageBreaks(3).Location = Cells(PageBreaks(2), 1)
        On Error Resume Next
        Set ActiveSheet.HPageBreaks(4).Location = Cells(PageBreaks(3), 1)
        On Error Resume Next
    ElseIf HCount = 1 Then
        If LRow > 55 Then
            Set ActiveSheet.HPageBreaks(1).Location = Cells(PageBreaks(0), 1)
            On Error Resume Next
        End If
    ElseIf HCount = 5 Then
        Set ActiveSheet.HPageBreaks(1).Location = Cells(PageBreaks(0), 1)
        On Error Resume Next
        Set ActiveSheet.HPageBreaks(2).Location = Cells(PageBreaks(1), 1)
        On Error Resume Next
        Set ActiveSheet.HPageBreaks(3).Location = Cells(PageBreaks(2), 1)
        On Error Resume Next
        Set ActiveSheet.HPageBreaks(4).Location = Cells(PageBreaks(3), 1)
        On Error Resume Next
        Set ActiveSheet.HPageBreaks(5).Location = Cells(PageBreaks(4), 1)
        On Error Resume Next
    End If
    ActiveSheet.PageSetup.PrintArea = "A1:AV" & PRow
    With ActiveSheet.PageSetup
        .LeftMargin = Application.InchesToPoints(0.7)
        .RightMargin = Application.InchesToPoints(0.1)
        .TopMargin = Application.InchesToPoints(0.2)
        .BottomMargin = Application.InchesToPoints(0.1)
    End With
    On Error Resume Next
    ActiveSheet.VPageBreaks(1).DragOff Direction:=xlToRight, RegionIndex:=1
    ActiveSheet.PageSetup.Zoom = 75
End Sub
Sub Hotkeys_wR()
    Cells(1, 1) = "Press Ctrl-Shift-S for 'Sort by Statistic' userform   |   Press Ctrl-Shift-R to Show Rankings"
    Application.MacroOptions Macro:="UserForm", Description _
        :="", ShortcutKey:="S"
    Application.MacroOptions Macro:="ShowRankings", Description:="", ShortcutKey _
        :="R"
End Sub
Sub Hotkeys_woR()
    Cells(1, 1) = "Press Ctrl-Shift-S for 'Sort by Statistic' userform"
    Application.MacroOptions Macro:="UserForm", Description _
        :="", ShortcutKey:="S"
    Application.MacroOptions Macro:="ShowRankings", Description:="", ShortcutKey _
        :="R"
End Sub
Sub ShowRankings()
Attribute ShowRankings.VB_ProcData.VB_Invoke_Func = "R\n14"
    Dim hidden_cols, col_pos, col As Variant
    
    hidden_cols = Array(5, 6, 8, 10, 12, 14, 16, 18, 19, 20, 21, 22, 24, 26, 28, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 42, 44, 46, 47, 48)
    If Cells(6, 8).Value <> "-" Then
            For Each col In hidden_cols:
                    If Columns(col).EntireColumn.Hidden Then
                        Columns(col).EntireColumn.Hidden = False
                    Else
                        Columns(col).EntireColumn.Hidden = True
                    End If
                Next col
        End If
End Sub
Sub UserFormTimer()
Attribute UserFormTimer.VB_ProcData.VB_Invoke_Func = "S\n14"
    Application.WindowState = xlMaximized
    Application.OnTime Now + TimeValue("00:00:02"), "UserForm"
End Sub
Sub UserForm()
Attribute UserForm.VB_ProcData.VB_Invoke_Func = "S\n14"
    Application.ScreenUpdating = True
    SortUF.Hide
    SortUF.Show
End Sub
Sub Minimize()
    Application.WindowState = xlMinimized
End Sub
Sub SortLTS(col As Integer)
    Dim Key, Data As Range
    Dim UB, LB, SRow, LRow, tmp, tmp2 As Integer
    
    Worksheets(1).Select
    LRow = Cells(1, 49)
    SRow = 4
    Do Until SRow = LRow
        If Cells(SRow, 1).Interior.ColorIndex = 15 Then
            UB = SRow
            Do Until Cells(SRow + 1, 1).Interior.ColorIndex <> 15
                SRow = SRow + 1
            Loop
            LB = SRow
            Set Key = Range(Cells(UB, col), Cells(LB, col))
            Set Data = Range(Cells(UB, 1), Cells(LB, LastCol()))
            If Application.Version >= 12# Then
                ActiveWorkbook.Worksheets(1).Sort.SortFields.Clear
                ActiveWorkbook.Worksheets(1).Sort.SortFields.Add Key:= _
                    Key, SortOn:=0, Order:=xlDescending, DataOption:= _
                    xlSortNormal
                With ActiveWorkbook.Worksheets(1).Sort
                    .SetRange Data
                    .Header = xlGuess
                    .MatchCase = False
                    .Orientation = xlTopToBottom
                    .SortMethod = xlPinYin
                    .Apply
                End With
            Else
                Data.Sort Key1:=Range(Cells(UB - 1, col), Cells(LB, col)), Order1:=xlDescending, Header:=xlNo, _
                OrderCustom:=1, MatchCase:=False, Orientation:=xlTopToBottom, _
                DataOption1:=xlSortNormal
            End If
            If (Cells(3, 12) = "Sharpe Ratio" And col = 12) Or (Cells(3, 17) = "Sharpe Ratio" And col = 17) Then
                tmp = UB
                tmp2 = UB
                If (Cells(3, 12) = "Sharpe Ratio" And Cells(tmp2, 12) = "N/A") Or (Cells(3, 17) = "Sharpe Ratio" And Cells(tmp2, 17) = "N/A") Then
                    Do Until (Cells(3, 12) = "Sharpe Ratio" And Cells(tmp2 + 1, 12) <> "N/A") Or (Cells(3, 17) = "Sharpe Ratio" And Cells(tmp2 + 1, 17) <> "N/A")
                        tmp2 = tmp2 + 1
                    Loop
                    Range(Cells(tmp, 1), Cells(tmp2, LastCol() + 1)).Cut
                    Range(Cells(LB + 1, 1), Cells(LB + 1, LastCol() + 1)).Insert Shift:=xlDown
                End If
            End If
        End If
        SRow = SRow + 1
    Loop
End Sub
Sub SortSTL(col As Integer)
    Dim Key, Data As Range
    Dim UB, LB, SRow, LRow As Integer
    
    Worksheets(1).Select
    LRow = Cells(1, 49)
    SRow = 4
    Do Until SRow = LRow
        If Cells(SRow, 1).Interior.ColorIndex = 15 Then
            UB = SRow
            Do Until Cells(SRow + 1, 1).Interior.ColorIndex <> 15
                SRow = SRow + 1
            Loop
            LB = SRow
            Set Key = Range(Cells(UB, col), Cells(LB, col))
            Set Data = Range(Cells(UB, 1), Cells(LB, LastCol()))
            If Application.Version >= 12# Then
                ActiveWorkbook.Worksheets(1).Sort.SortFields.Clear
                ActiveWorkbook.Worksheets(1).Sort.SortFields.Add Key:= _
                    Key, SortOn:=0, Order:=xlAscending, DataOption:= _
                    xlSortNormal
                With ActiveWorkbook.Worksheets(1).Sort
                    .SetRange Data
                    .Header = xlGuess
                    .MatchCase = False
                    .Orientation = xlTopToBottom
                    .SortMethod = xlPinYin
                    .Apply
                End With
            Else
                Data.Sort Key1:=Range(Cells(UB, col), Cells(LB, col)), Order1:=xlAscending, Header:=xlNo, _
                OrderCustom:=1, MatchCase:=False, Orientation:=xlTopToBottom, _
                DataOption1:=xlSortNormal
            End If
        End If
        SRow = SRow + 1
    Loop
End Sub
Function LastRow() As Integer
    LastRow = ActiveSheet.UsedRange.SpecialCells(xlCellTypeLastCell).row
End Function

Function LastCol()
    LastCol = ActiveSheet.UsedRange.SpecialCells(xlCellTypeLastCell).Column
End Function

