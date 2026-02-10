CC = cc
CFLAGS = -O2 -Wall -Wextra
UNAME := $(shell uname)

ifeq ($(UNAME), Darwin)
    # Try pkg-config first, fall back to brew
    RAYLIB_CFLAGS := $(shell pkg-config --cflags raylib 2>/dev/null || echo "-I/opt/homebrew/include")
    RAYLIB_LIBS := $(shell pkg-config --libs raylib 2>/dev/null || echo "-L/opt/homebrew/lib -lraylib -framework OpenGL -framework Cocoa -framework IOKit -framework CoreVideo")
else
    RAYLIB_CFLAGS := $(shell pkg-config --cflags raylib)
    RAYLIB_LIBS := $(shell pkg-config --libs raylib)
endif

asteroids: main.c
	$(CC) $(CFLAGS) $(RAYLIB_CFLAGS) -o asteroids main.c $(RAYLIB_LIBS) -lm

clean:
	rm -f asteroids

.PHONY: clean
