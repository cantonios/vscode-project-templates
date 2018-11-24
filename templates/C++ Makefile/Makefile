# compilers and flags
CC        := g++
CPP_FLAGS := -Wall -pedantic -Wextra -std=c++17 -g -O0

LD        := g++
LD_FLAGS  := 

# folder structure
BIN       := bin
SRC       := src
INCLUDE   := include
BUILD     := build

# update flags
CPP_FLAGS := $(CPP_FLAGS) -I$(INCLUDE)

# program outputs
LIBRARIES   :=
EXECUTABLE  := main

# C sources and dependences
CPP_SOURCES := $(wildcard $(SRC)/*.cpp) 
CPP_DEPENDS := $(patsubst $(SRC)/%.cpp, $(BUILD)/%.cpp.d, $(CPP_SOURCES))
CPP_OBJECTS := $(patsubst $(SRC)/%.cpp, $(BUILD)/%.cpp.o, $(CPP_SOURCES))

# platform-specific commands and settings
ifeq ($(OS),Windows_NT)
	RM_CALL     = del /Q /F $(subst /,\,$(1)) 2>NUL
	MKDIR_CALL  = if not exist "$(subst /,\,$(1))" mkdir "$(subst /,\,$(1))"
	FIND_CALL   = dir /b/s "$(subst /,\,$(1))"
	PATH_CALL   = $(subst /,\,$(1))
else
	RM_CALL     = rm -rf $(1)
	MKDIR_CALL  = mkdir -p $(1)
	FIND_CALL   = find -L . -name $(1)
	PATH_CALL   = $(1)
endif

# targets
TARGET := $(BIN)/$(EXECUTABLE)

all:  $(TARGET)

deps: $(CPP_DEPENDS)

rebuild: clean all

run: all
	$(call PATH_CALL,$(TARGET))

clean:
	$(call RM_CALL,$(TARGET) $(CPP_DEPENDS) $(CPP_OBJECTS) )

# include dependency rules
-include $(CPP_DEPENDS)

# build and bin directories
$(BUILD):
	$(call MKDIR_CALL,$@)

$(BIN):
	$(call MKDIR_CALL,$@)

# dependencies
$(BUILD)/%.cpp.d: $(SRC)/%.cpp | $(BUILD)
	$(CC) $(CPP_FLAGS) -MM -MT $(@:.d=.o) $< >> $@

# objects
$(BUILD)/%.cpp.o: $(SRC)/%.cpp | $(BUILD)
	$(CC) $(CPP_FLAGS) -o $@ -c $<

# binary
$(BIN)/$(EXECUTABLE): $(CPP_OBJECTS) | $(BIN)
	$(LD) $(LD_FLAGS) $(CPP_OBJECTS) -o $@ $(LIBRARIES)

