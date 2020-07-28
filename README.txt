Graphics Programming Exam (PG6201 #2)
Kristiania University College, November 2019.
[View result here](https://lennarthansen.dev/particles/live)

#Build the project
* yarn install          (or npm)
* yarn build            (or 'start' to run the development build/server)

#Running the application
To run this project (exam), serve the files in the build folder with any http-server.
With nodejs that could be either of these when in the project folder
* serve -s build
* http-server build

#Using the application
Mousedown + drag to rotate the scene/camera.
Mousewheel to zoom in and out.
Up to the right there are four buttons to toggle a view of the current compiled
shader code used to current scene.
Below that, there are some buttons to switch to some premade scenes to illustrate
solutions for the tasks.
To the left there is a options panel (toggle on/off with a button to the top left),
that can be used to change settings for the current stuff in the scene.
In particular the option 'Count' in the particles section is to change the amount
of particles to render in the scene. (Task 4).
Bottom right is a basic FPS counter.

##Compatability notes
This exam was built with webgl2, so it wont work properly (in my case, not at all)
on the safari browser. But I tested myself chrome and firefox (mac) and it worked
the way I intended on those.

##Notes regarding the exam problems
I'll start off with the explaining fact that I chose to program this exam almost
purely webgl as opposed to ThreeJS. (I use threejs' matrix to calculate shear)
In Task 4 it says: "The most obvious optimization would be to move the per-particle
calculations to the GPU/shaders.", and when I did my research on how to solve this,
I found that webgl2 had added support for 'Transform Feedback Buffers' which is an
excellent method of this problem, however, I couldn't find anyway to use this feature
with ThreeJS. The things I tried was, first looking through the documentation and
trying to find if there is someway one could make it work by extending/using built-in
api. F.eks, there exists callbacks such as: .onBeforeRender() and .onBeforeCompile()
that one can use to extend features. That got me close to making it work, but not
quite, I had two main problems: 1) When setting up a 'transform feedback' shader,
one needs to call: gl.transformFeedbackVaryings(program, ['vPosition', ...etc
on the program before linking the program, I couldnt find anyway todo this with
threejs. 2) Was accesing the array buffers in the Geometry objects, as I need
two sets of buffers in transform feedback that I can swap back and forth when
rendering. ThreeJS has hidden the 'attribute' property within the renderer,
and I couldnt find anyway to get access to that property.
I tried two solutions: 1) just alter the threejs library, that worked, sortof,
but I kept getting problems I couldnt be quite pin down; was I doing something
wrong or have I somehow made something else break by touching code within the
threejs library. So the next solution was to try make a replacement Renderer class,
though I ended up in the exact same place as with altering code in the libary.
As a sidenote, there is currently a solution being discussed in the dev-branch
on wheter to give a callback when creating geometry such that one has more control
over the buffers.

So, I chose to take the nebulous road down all in webgl2, mostly because I really
really wanted to try two things, transform feedback and uniform buffer objects,
which I got todo. funfun =)
