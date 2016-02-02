# illyriad-tools
This is the beginning of a suite of tools that can be used to enhance your Illyriad experience.
They are just in the beginning stages of development, but hopefully they are tools that others find useful.
Currently there are three main tools: Map Bookmarks, Square Notes, and the Town Overview.

# Installation
This is a script you can plug and play into your Chrome or Firefox desktop browser, using one of two tools:
GreaseMonkey (firefox) or TamperMonkey (chrome). They are basically the same tool with different interfaces. Essentially,
you copy and paste the code of this script into a new 'user script', and then enable it. Here are yous step by steps:

**GreaseMonkey**
* install the greasemonkey browser addon, using the firefox Addons page, and activate it
* on the firefox Addons page, a new 'side menu' item has appeared, called 'User Scripts'. goto it
* click 'New user script' in the upper left
* fill out the form that pops up. the title of this script is "Haxorone's Illyriad Tools", but call it what you want
* click 'OK'
* copy and paste the code from illyriad.js in this git repo into the 'script editor'
* click 'Save' in the upper left
* close that window
* goto Illyriad tab and refresh the page

**TamperMonkey**
* install the greasemonkey browser addon, using the chrome Extensions page, and activate it
* on the chrome Extensions page, scroll down to TamperMonkey, and click 'options' under the name
* near the upper right is a 'tab' that has an icon with a 'green plus sign' on it. click it to create a new user script
* copy and paste the code from illyriad.js in this git repo into the 'script editor'
* click 'Save' (looks like a little 'floppy disk' icon) in the upper left
* close that tab
* goto Illyriad tab and refresh the page

# Map Bookmarks
This tool allows you to keep track of locations that are of interest to you in game, without having to reference a
spreadsheet, which is apparently the standard alternative to this tool. The tool allows you to make some short, searchable
notes about the square, and also classify the square based on several criteria. Personally I use it to bookmark my
towns, the locations I want to make towns, my allies hubs, the locations of rare resources I frequent, and interesting
map locations in general. You can use it for whatever you want :).

**To Bookmark a Square, or edit a Bookmark**
* goto the map and find the square
* click the square and wait for the popup to show
* in the popup, select 'Bookmark this Square' or 'Edit this Bookmark'
* fill out the form in the modal that pops up, and click save

**To goto one of your Bookmarks**
* goto the map screen
* click the 'black square with a letter B in it' in the upper left corner of your map
* use filter tools on the right side of the modal to narrow your bookmark list and sort it
* click the bookmark you wish to visit

**To remove a bookmark**
* goto the map and find the square
* click the square
* click 'Edit this bookmark'
* in the modal, click the 'delete' button
* confirm deletion

**- OR -**

* goto the map screen
* click the B icon in the upper left of the map
* find the bookmark you wish to delete
* click the red [X] on the right side of the link
* confirm deletion

# Square Notes
This tool can be used to remind you a week from now why you were interested in a particular square.
For instance, you may lay down your city somewhere with the full intent of using the squares around your city
for a specific Sov bonus; however, a week from now, you may not fully remember your master plan. Using this tool
will ensure that you don't forget.

**To make/edit a note on a square**
* goto the map and find the square you wish to remember something about
* click the square
* on the popup, click 'Add Note' or 'Edit Note'
* fill out the notes box in the modal that pops up
* click save

**To view a note**
* goto the map and find the square
* click the square
* notice the notes you took at the bottom of the popup

**To remove a note**
* goto the map and find the square
* click the square
* click 'Edit Note'
* in the modal, click the 'delete' button
* confirm you want to delete it

# Town Overview
While making the two tools above, I was asked numerous times to make this tool. Apparently this a hugely saught after tool,
and for good reason. Essentially, this tool gives you a table of all of you cities, their current basic and advanced
resources, estimations of when those resources will reach their max capacity, a list of each city's builds, and a list
of each cities current researches. With this tool, you can see where you need what resource in your empire, and where
you have that resource available.

**To populate the Town Overview**
Because of the rules set in line by the Developers of the game, you must first visit each town at least one time during
this session, before the town will show in this Overview. You can visit any page for each town, but you must visit each
town. Once you have done that, the needed information for this box becomes available. By default, the box is visible when
you first load the page. You can close it at any time. If you need to open or close the Town Overview you can clicke the
'OV' icon, located in the upper left corner of your screen.

**To show your builds and researches**
When you first load the Town Overview, you only see the basic resources and city name. Next to the city name, on the left,
there is a green [+]. If you click that, it will show and hide your build/techs on a row below your basic resoures for
that city.

**To view your advanced resoures**
Above the table with our basic resources, there are two links: basic and advanced. The default table being viewed is
the basic table. If you click the 'advanced' link, the basic table will hide, and the advanced table will take it's
place. The advanced table will show your a town by town breakdown of your advanced resources, horses & livestock & such.

# Thanks
Before starting this project, I talked a lot with a player named Millia36. I was told in those conversations that most
players use Excel or Google spreadsheets to track most of this stuff. That struck me as inefficient, so I wrote the
Bookmark and Square Notes tools. Through further conversation with Millia36 and another player named Gonarr (and a
short convo with Tachyon) I found that most people also wanted to see a Town Overview, so I built that too.

I also want to thank Mahuat for being a first tester of the tools. With the invaluable feedback I got from that test run
I was able to improve the tool to a useable state. Also those conversations provided some clarity on where the project
could be headed, which brought to light some major overhaul points, which turned into a complete rewrite of what I had.
That all worked out for the best though, because it all works much smoother now.

# Final Notes
This tool is strictly browser based. It does not send or receive any information to or from any third party anything. All it does is interact with Illyriad, and save information directly to your browser for later use. As such, that means if you use two different brwosers to play on one account (like firefox at work and chrome at home), or even two different computers (like a work laptop and home desktop), you will not be able to carry your bookmarks or notes with you between the two browsers/computers. This may change down the line, but right now, it is a one browser solution, requiring no external communication at all, because I think privacy is important.

# Future Features
There are plans for other features, but by all means, please if you have an idea, submit a ticket here, and I will
get around to it eventually, if I am not already working on it. If you do do that though, make sure to be specific.
Most people reference the 'fabled IllyTools', but sadly I have little reference points for that, because 1) I never
used it, and 2) nobody seems to have any code for it laying around. BTW, if you do, send it to me here :)
