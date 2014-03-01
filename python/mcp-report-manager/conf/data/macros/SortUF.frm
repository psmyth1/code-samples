VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} SortUF 
   Caption         =   "Sort by Specific Statistic"
   ClientHeight    =   1755
   ClientLeft      =   45
   ClientTop       =   330
   ClientWidth     =   5460
   OleObjectBlob   =   "SortUF.frx":0000
   StartUpPosition =   1  'CenterOwner
End
Attribute VB_Name = "SortUF"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False

Private Sub CloseButton_Click()
    Unload SortUF
End Sub

Private Sub OKButton_Click()
    Worksheets(1).Select
    Select Case StatOption.ListIndex
        Case -1
            MsgBox "Please select a statistic to sort by."
            Exit Sub
        Case 0: Call SortLTS(7)
        Case 1: Call SortLTS(9)
        Case 2: Call SortSTL(11)
        Case 3: Call SortLTS(13)
        Case 4: Call SortLTS(15)
        Case 5: Call SortLTS(17)
        Case 6: Call SortLTS(19)
        Case 7: Call SortSTL(21)
        Case 8: Call SortLTS(23)
        Case 9: Call SortSTL(25)
        Case 10: Call SortLTS(27)
        Case 11: Call SortSTL(29)
        Case 12: Call SortLTS(31)
        Case 13: Call SortLTS(33)
        Case 14: Call SortLTS(35)
        Case 15: Call SortLTS(37)
        Case 16: Call SortLTS(39)
        Case 17: Call SortLTS(41)
        Case 18: Call SortSTL(43)
        Case 19: Call SortSTL(45)
        Case 20: Call SortSTL(47)
    End Select
    Unload Me
End Sub

Private Sub Userform_Initialize()
    With StatOption
        .AddItem "Annualized Return"
        .AddItem "Compounded Return"
        .AddItem "Arithmetic Standard Deviation"
        .AddItem "Maximum Drawdown"
        .AddItem "2nd Maximum Drawdown"
        .AddItem "Sharpe Ratio"
        .AddItem "Cumulative Up-Capture"
        .AddItem "Cumulative Down-Capture"
        .AddItem "Annualized Up-Capture"
        .AddItem "Annualized Down-Capture"
        .AddItem "% Months Positive"
        .AddItem "% Months Negative"
        .AddItem "Average Monthly Return"
        .AddItem "Highest Period Return"
        .AddItem "Lowest Period Return"
        .AddItem "Average Gain in Gain Period"
        .AddItem "Average Loss in Loss Period"
        .AddItem "Annualized Alpha"
        .AddItem "Beta"
        .AddItem "Correlation Coefficient"
        .AddItem "R-Squared"
    End With
End Sub
