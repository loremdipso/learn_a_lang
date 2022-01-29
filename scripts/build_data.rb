#!/usr/bin/env ruby
require 'json'

def main()
	languages = []
	Dir.chdir(File.join(__dir__, "..", "data")) do
		dirs = Dir.glob('*').select {|f| File.directory? f}
		dirs.each do |d|
			languages.push({
				:name => File.basename(d),
				:words => get_words_from_file(d)
			})
		end
		File.open("../src/data.json", "w") {|f| f.puts(languages.to_json)}
	end
	puts "Done"
end

def get_words_from_file(d)
	words = []
	Dir.chdir(d) do
		files = Dir.glob('*txt')
		files.each do |f|
			part_of_speech = File.basename(f, File.extname(f))
			lines = File.read(f).split("\n")
			lines.each do |line|
				word = get_word_from_line(line, part_of_speech)
				words.push(word) if word != nil
			end
		end
	end
	return words
end

def get_word_from_line(line, part_of_speech)
	# for now let's assume it's "word or phrase (translation)"
	pieces = line.split(/(^[^\(].*)\(([^\)]*)\)/)
	return nil if pieces.size != 3
	value = pieces[1].strip
	translation = pieces[2].strip
	return {
		:value => value,
		:translation => translation,
		:part_of_speech => part_of_speech
	}
end

main()